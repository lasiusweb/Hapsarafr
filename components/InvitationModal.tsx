import React, { useState } from 'react';
import { User } from '../types';

interface InvitationModalProps {
    currentUser: User;
    onClose: () => void;
}

const InvitationModal: React.FC<InvitationModalProps> = ({ currentUser, onClose }) => {
    const [email, setEmail] = useState('');
    
    const handleInvite = () => {
        // Mock invite logic
        alert(`Invitation sent to ${email}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Invite User</h2>
                <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Enter email address" 
                    className="w-full p-2 border rounded mb-4"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                    <button onClick={handleInvite} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Send Invite</button>
                </div>
            </div>
        </div>
    );
};

export default InvitationModal;