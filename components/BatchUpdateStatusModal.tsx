import React, { useState } from 'react';
// FIX: Import from the newly created types.ts file
import { FarmerStatus } from '../types';
import CustomSelect from './CustomSelect';

interface BatchUpdateStatusModalProps {
    selectedCount: number;
    onUpdate: (newStatus: FarmerStatus) => void;
    onCancel: () => void;
}

const BatchUpdateStatusModal: React.FC<BatchUpdateStatusModalProps> = ({ selectedCount, onUpdate, onCancel }) => {
    const [newStatus, setNewStatus] = useState<FarmerStatus>(FarmerStatus.Registered);

    const handleUpdate = () => {
        if (window.confirm(`Are you sure you want to change the status of ${selectedCount} farmer(s) to "${newStatus}"?`)) {
            onUpdate(newStatus);
        }
    };

    const statusOptions = Object.values(FarmerStatus).map(s => ({ value: s, label: s }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Batch Update Status</h2>
                    <p className="text-gray-600 mb-6">
                        You have selected <span className="font-bold text-green-600">{selectedCount}</span> farmer(s).
                        Please choose the new status to apply to all of them.
                    </p>

                    <div>
                        <label htmlFor="status-update" className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                        <CustomSelect
                          value={newStatus}
                          onChange={(value) => setNewStatus(value as FarmerStatus)}
                          options={statusOptions}
                        />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                    <button type="button" onClick={handleUpdate} className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition font-semibold">Update Status</button>
                </div>
            </div>
        </div>
    );
};

export default BatchUpdateStatusModal;