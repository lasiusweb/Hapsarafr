import React from 'react';

const changelogData = [
    {
        version: '1.2.0',
        date: '2024-07-26',
        changes: [
            'Added Edit & Delete functionality for Subsidy Payments on the Farmer Details page.',
            'Implemented a confirmation modal for deleting payments to prevent accidental data loss.',
            'Improved UI for subsidy payment form to handle both creating and editing records.',
        ],
    },
    {
        version: '1.1.0',
        date: '2024-07-25',
        changes: [
            'Introduced the Farmer Details page to view all information for a single farmer.',
            'Added Subsidy Payment tracking and recording.',
            'Enhanced the application routing to support deep links to farmer profiles.',
        ],
    },
    {
        version: '1.0.0',
        date: '2024-07-24',
        changes: [
            'Initial release of the Hapsara Farmer Registration application.',
            'Core features include farmer registration, listing, filtering, and offline support.',
            'User authentication and basic role-based access control implemented.',
        ],
    },
];

const ChangelogModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">What's New</h2>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                    {changelogData.map(entry => (
                        <div key={entry.version}>
                            <div className="flex items-baseline gap-3">
                                <h3 className="text-lg font-bold text-gray-800">Version {entry.version}</h3>
                                <p className="text-sm text-gray-500">{entry.date}</p>
                            </div>
                            <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600">
                                {entry.changes.map((change, index) => (
                                    <li key={index}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
