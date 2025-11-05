import React, { useState, useEffect } from 'react';
import { User } from '../types';
import AvatarSelectionModal from './AvatarSelectionModal';

interface ProfilePageProps {
    currentUser: User;
    onSave: (updatedUser: User) => void;
    onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onSave, onBack }) => {
    const [name, setName] = useState(currentUser.name);
    const [avatar, setAvatar] = useState(currentUser.avatar);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSave = () => {
        onSave({
            ...currentUser,
            name,
            avatar,
        });
    };

    return (
        <>
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-2xl mx-auto">
                    <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                         </svg>
                        Back to Dashboard
                    </button>
                    <div className="bg-white rounded-lg shadow-xl p-8">
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                                <img src={avatar} alt="Current Avatar" className="w-32 h-32 rounded-full border-4 border-gray-200" />
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full p-2 hover:bg-green-700 transition"
                                    aria-label="Change avatar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">{currentUser.name}</h2>
                            <p className="text-gray-500">{currentUser.role}</p>
                        </div>

                        <div className="mt-8 space-y-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <p className="mt-1 p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
                                    {currentUser.role} (Role cannot be changed)
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                             <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                             <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && (
                <AvatarSelectionModal
                    currentAvatar={avatar}
                    onSelect={(newAvatar) => {
                        setAvatar(newAvatar);
                        setIsModalOpen(false);
                    }}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
};

export default ProfilePage;
