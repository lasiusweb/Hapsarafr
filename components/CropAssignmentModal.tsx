

import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CropModel, FarmPlotModel, CropAssignmentModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, Season, CropVerificationStatus, ActivityType } from '../types';
import CustomSelect from './CustomSelect';
import { SAMPLE_CROPS } from '../data/cropData'; // Import sample crop data

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

    // Seed sample data if empty (development convenience)
    useMemo(async () => {
         if (crops.length === 0) {
             await database.write(async () => {
                 for (const crop of SAMPLE_CROPS) {
                     await database.get<CropModel>('crops').create(c => {
                         c.name = crop.name;
                         c.isPerennial = crop.isPerennial;
                         c.defaultUnit = crop.defaultUnit;
                         c.verificationStatus = crop.verificationStatus;
                         c.tenantId = currentUser.tenantId;
                     });
                 }
             });
         }
    }, [crops.length, database, currentUser.tenantId]);

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

                // If this is marked primary, unset primary for other crops on this plot for same year/season if needed
                // For simplicity, we allow multiple primary if they are intercropped, but typically one main crop.
                
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
                    log.description = `Assigned ${cropName} (${isPrimary ? 'Primary' : 'Secondary'}) to ${farmPlot.name} for ${season} ${year}.`;
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
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Assign Crop to {farmPlot.name}</h2>
                    <p className="text-sm text-gray-500">Track what is growing to get better advice.</p>
                </div>
                <div className="p-8 space-y-6">
                    
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">1. Select Crop</h4>
                        {!showCustom ? (
                            <div>
                                <CustomSelect label="Available Crops" options={cropOptions} value={selectedCropId} onChange={setSelectedCropId} placeholder="-- Choose from Database --" />
                                <button onClick={() => setShowCustom(true)} className="text-sm text-blue-600 hover:underline mt-2 flex items-center gap-1">
                                    <span>+</span> Can't find it? Add custom crop
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-3 rounded border">
                                 <label className="block text-sm font-medium text-gray-700">Custom Crop Name</label>
                                 <input type="text" value={customCropName} onChange={e => setCustomCropName(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g. Dragon Fruit" />
                                 <p className="text-xs text-gray-500 mt-1">This will be submitted for verification.</p>
                                 <button onClick={() => setShowCustom(false)} className="text-sm text-blue-600 hover:underline mt-2">Back to list</button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">2. Season & Role</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect label="Season" value={season} onChange={v => setSeason(v as Season)} options={Object.values(Season).map(s => ({value: s, label: s}))} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Year</label>
                                <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                            </div>
                        </div>

                        <div className={`p-4 rounded-md border cursor-pointer transition-colors ${isPrimary ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`} onClick={() => setIsPrimary(!isPrimary)}>
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isPrimary ? 'border-green-600 bg-green-600' : 'border-gray-400'}`}>
                                    {isPrimary && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div>
                                    <span className="font-bold text-gray-800">Primary Crop</span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This is the main commercial focus for this plot. {isPrimary ? "You will receive tailored AI advice for this crop." : "Uncheck if this is an intercrop or secondary crop."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm">Assign Crop</button>
                </div>
            </div>
        </div>
    );
};

export default CropAssignmentModal;
