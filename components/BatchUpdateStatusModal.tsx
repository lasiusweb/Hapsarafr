import React, { useState } from 'react';
import { FarmerStatus } from '../types';

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
                        <div className="relative">
                            <select
                                id="status-update"
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as FarmerStatus)}
                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition appearance-none pr-10"
                            >
                                {Object.values(FarmerStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
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
