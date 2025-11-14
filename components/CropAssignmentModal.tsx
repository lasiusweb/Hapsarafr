import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CropModel, FarmPlotModel, CropAssignmentModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, Season, CropVerificationStatus, ActivityType } from '../types';
import CustomSelect from './CustomSelect';

interface CropAssignmentModalProps {
    farmPlot: FarmPlotModel;
    onClose: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const CropAssignmentModal: React.FC<CropAssignmentModalProps> = ({ farmPlot, onClose, currentUser, setNotification }) => {
    const database = useDatabase();
    const [selectedCropId, setSelectedCropId] = useState('');
    const [season, setSeason] = useState<Season>(Season.Kharif);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isPrimary, setIsPrimary] = useState(true);
    const [showCustom, setShowCustom] = useState(false);
    const [customCropName, setCustomCropName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const crops = useQuery(useMemo(() => database.get<CropModel>('crops').query(Q.where('verification_status', CropVerificationStatus.Verified)), [database]));
    const cropOptions = useMemo(() => crops.map(c => ({ value: c.id, label: c.name })), [crops]);

    const handleSave = async () => {
        setIsSubmitting(true);
        let cropIdToAssign = selectedCropId;

        try {
            await database.write(async () => {
                if (showCustom && customCropName) {
                    const newCrop = await database.get<CropModel>('crops').create(c => {
                        c.name = customCropName;
                        c.isPerennial = false; // Default
                        c.defaultUnit = 'kg'; // Default
                        c.verificationStatus = CropVerificationStatus.Pending;
                        c.tenantId = currentUser.tenantId;
                    });
                    cropIdToAssign = newCrop.id;
                }

                if (!cropIdToAssign) {
                    throw new Error("No crop selected or created.");
                }

                await database.get<CropAssignmentModel>('crop_assignments').create(ca => {
                    ca.farmPlotId = farmPlot.id;
                    ca.cropId = cropIdToAssign;
                    ca.season = season;
                    ca.year = year;
                    ca.isPrimaryCrop = isPrimary;
                });
                
                const cropName = showCustom ? customCropName : crops.find(c => c.id === cropIdToAssign)?.name;
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmPlot.farmerId;
                    log.activityType = ActivityType.CROP_ASSIGNED;
                    log.description = `Assigned ${cropName} to ${farmPlot.name} (${farmPlot.acreage} acres) for ${season} ${year}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });

            });
            setNotification({ message: 'Crop assigned successfully.', type: 'success' });
            onClose();
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to assign crop.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Assign Crop to {farmPlot.name}</h2></div>
                <div className="p-8 space-y-4">
                    {!showCustom ? (
                        <div>
                            <CustomSelect label="Select a Crop" options={cropOptions} value={selectedCropId} onChange={setSelectedCropId} placeholder="-- Choose Crop --" />
                            <button onClick={() => setShowCustom(true)} className="text-sm text-blue-600 hover:underline mt-2">Or, add a custom crop</button>
                        </div>
                    ) : (
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Custom Crop Name</label>
                             <input type="text" value={customCropName} onChange={e => setCustomCropName(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                             <p className="text-xs text-gray-500 mt-1">This will be submitted for verification by an administrator.</p>
                             <button onClick={() => setShowCustom(false)} className="text-sm text-blue-600 hover:underline mt-2">Select from list</button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <CustomSelect label="Season" value={season} onChange={v => setSeason(v as Season)} options={Object.values(Season).map(s => ({value: s, label: s}))} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                        </div>
                    </div>

                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="h-4 w-4 text-green-600 border-gray-300 rounded" />
                        Set as primary crop for this assignment
                    </label>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Assign Crop</button>
                </div>
            </div>
        </div>
    );
};

export default CropAssignmentModal;
