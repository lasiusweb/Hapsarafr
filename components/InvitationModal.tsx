import React from 'react';

interface InvitationModalProps {
    invitationCode: string;
    onClose: () => void;
}

const InvitationModal: React.FC<InvitationModalProps> = ({ invitationCode, onClose }) => {
    const invitationLink = `${window.location.origin}?invitation=${invitationCode}`;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Invitation Generated</h2>
                    <p className="text-gray-600 mb-4">Please manually send the following invitation code or link to the new user. <strong className="text-red-600">This application will not send an email.</strong></p>
                    
                    <div className="mb-4">
                        <label className="font-semibold text-gray-700">Invitation Code</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="text" readOnly value={invitationCode} className="w-full p-2 bg-gray-100 border rounded font-mono" />
                            <button onClick={() => handleCopy(invitationCode)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Copy</button>
                        </div>
                    </div>

                    <div>
                        <label className="font-semibold text-gray-700">Invitation Link</label>
                         <div className="flex items-center gap-2 mt-1">
                            <input type="text" readOnly value={invitationLink} className="w-full p-2 bg-gray-100 border rounded font-mono" />
                            <button onClick={() => handleCopy(invitationLink)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Copy</button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Done</button>
                </div>
            </div>
        </div>
    );
};

export default InvitationModal;