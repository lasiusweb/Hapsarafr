import React from 'react';

interface SyncConfirmationModalProps {
    syncCount: number;
    apiUrl: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const SyncConfirmationModal: React.FC<SyncConfirmationModalProps> = ({ syncCount, apiUrl, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Sync</h2>
                    <p className="text-gray-600 mb-4">
                        You are about to sync <span className="font-bold text-green-600">{syncCount}</span> pending farmer record(s).
                    </p>
                    <p className="text-gray-600 mb-6">
                        The data will be sent to the following endpoint:
                    </p>
                    <div className="bg-gray-100 p-3 rounded-md text-sm text-gray-800 font-mono break-all">
                        {apiUrl}
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                    <button type="button" onClick={onConfirm} className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-semibold">Confirm & Sync</button>
                </div>
            </div>
        </div>
    );
};

export default SyncConfirmationModal;