import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { CropAssignmentModel, HarvestLogModel, CropModel, ActivityLogModel } from '../db';
import { User, ActivityType } from '../types';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';

interface HarvestLoggerProps {
    cropAssignment: CropAssignmentModel;
    onClose: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const HarvestLogger: React.FC<HarvestLoggerProps> = ({ cropAssignment, onClose, currentUser, setNotification }) => {
    const database = useDatabase();
    
    const crop = useQuery(useMemo(() => database.get<CropModel>('crops').query(Q.where('id', cropAssignment.cropId)), [database, cropAssignment.cropId]))[0];

    const [formData, setFormData] = useState({
        harvest_date: new Date().toISOString().split('T')[0],
        quantity: '',
        unit: crop?.defaultUnit || 'kg',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        const quantity = parseFloat(formData.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<HarvestLogModel>('harvest_logs').create(hl => {
                    hl.cropAssignmentId = cropAssignment.id;
                    hl.harvestDate = formData.harvest_date;
                    hl.quantity = quantity;
                    hl.unit = formData.unit;
                    hl.notes = formData.notes;
                    hl.createdBy = currentUser.id;
                });

                const farmPlot = await cropAssignment.farmPlot.fetch();
                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmPlot!.farmerId;
                    log.activityType = ActivityType.HARVEST_LOGGED;
                    log.description = `Logged harvest of ${quantity} ${formData.unit} of ${crop.name} from ${farmPlot!.name}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Harvest logged successfully.', type: 'success' });
            onClose();
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to log harvest.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Log Harvest for {crop?.name}</h2></div>
                <div className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Harvest Date</label>
                            <input type="date" value={formData.harvest_date} onChange={e => setFormData(s => ({ ...s, harvest_date: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input type="number" value={formData.quantity} onChange={e => setFormData(s => ({ ...s, quantity: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Unit</label>
                            <input type="text" value={formData.unit} onChange={e => setFormData(s => ({ ...s, unit: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea value={formData.notes} onChange={e => setFormData(s => ({...s, notes: e.target.value}))} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                    <div className="text-center pt-2">
                        <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed">Use Voice Input (Coming Soon)</button>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Log Harvest</button>
                </div>
            </div>
        </div>
    );
};

export default HarvestLogger;
