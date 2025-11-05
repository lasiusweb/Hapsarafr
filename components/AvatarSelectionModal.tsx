import React from 'react';
import { AVATARS } from '../data/avatars';

interface AvatarSelectionModalProps {
    currentAvatar: string;
    onSelect: (avatarUrl: string) => void;
    onClose: () => void;
}

const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({ currentAvatar, onSelect, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Choose your Avatar</h3>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                        {AVATARS.map((avatar, index) => (
                            <button
                                key={index}
                                onClick={() => onSelect(avatar)}
                                className={`rounded-full p-1 transition-all duration-200 ${currentAvatar === avatar ? 'ring-4 ring-green-500' : 'hover:ring-2 hover:ring-green-300'}`}
                                aria-label={`Select avatar ${index + 1}`}
                            >
                                <img
                                    src={avatar}
                                    alt={`Avatar option ${index + 1}`}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Close</button>
                </div>
            </div>
        </div>
    );
};

export default AvatarSelectionModal;
