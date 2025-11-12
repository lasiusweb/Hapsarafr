import React, { useState, useEffect } from 'react';
import { User, Group, ExpertiseTagEnum } from '../types';
import AvatarSelectionModal from './AvatarSelectionModal';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { UserProfileModel } from '../db';
import { Q } from '@nozbe/watermelondb';

interface ProfilePageProps {
    currentUser: User;
    groups: Group[];
    onSave: (updatedUser: User) => Promise<void>;
    onBack: () => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, groups, onSave, onBack, setNotification }) => {
    const database = useDatabase();
    const userProfileQuery = React.useMemo(() => database.get<UserProfileModel>('user_profiles').query(Q.where('user_id', currentUser.id)), [database, currentUser.id]);
    const userProfileResult = useQuery(userProfileQuery);
    const userProfile = userProfileResult.length > 0 ? userProfileResult[0] : null;

    const [name, setName] = useState(currentUser.name);
    const [avatar, setAvatar] = useState(currentUser.avatar);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Community Profile State
    const [isMentor, setIsMentor] = useState(false);
    const [expertiseTags, setExpertiseTags] = useState<Set<ExpertiseTagEnum>>(new Set());

    useEffect(() => {
        if (userProfile) {
            setIsMentor(userProfile.isMentor);
            try {
                const tags = JSON.parse(userProfile.expertiseTags || '[]');
                setExpertiseTags(new Set(tags));
            } catch (e) {
                console.error("Failed to parse expertise tags", e);
                setExpertiseTags(new Set());
            }
        }
    }, [userProfile]);
    
    const userGroup = groups.find(g => g.id === currentUser.groupId);

    const handleSave = async () => {
        try {
            await database.write(async () => {
                // Save user profile details (name, avatar - handled by parent)
                await onSave({ ...currentUser, name, avatar });
                
                // Save community profile details
                if (userProfile) {
                    await userProfile.update(profile => {
                        profile.isMentor = isMentor;
                        profile.expertiseTags = JSON.stringify(Array.from(expertiseTags));
                    });
                } else {
                    await database.get<UserProfileModel>('user_profiles').create(profile => {
                        profile.userId = currentUser.id;
                        profile.isMentor = isMentor;
                        profile.expertiseTags = JSON.stringify(Array.from(expertiseTags));
                    });
                }
            });
            setNotification({ message: 'Profile updated successfully.', type: 'success' });
        } catch (error) {
            console.error("Failed to update profile:", error);
            setNotification({ message: 'Failed to update profile. Please try again.', type: 'error' });
        }
    };
    
    const handleTagChange = (tag: ExpertiseTagEnum) => {
        setExpertiseTags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tag)) {
                newSet.delete(tag);
            } else {
                newSet.add(tag);
            }
            return newSet;
        });
    };

    return (
        <>
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-4xl mx-auto">
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
                            <p className="text-gray-500">{userGroup?.name || 'No Group'}</p>
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
                                <label className="block text-sm font-medium text-gray-700">Group</label>
                                <p className="mt-1 p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
                                    {userGroup?.name || 'No Group'} (Group is managed by an administrator)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-white rounded-lg shadow-xl p-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Community Profile</h3>
                        <div className="space-y-6">
                             <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => setIsMentor(!isMentor)}>
                                <div>
                                    <p className="font-semibold text-gray-700">Become a Mentor</p>
                                    <p className="text-sm text-gray-500">Allow other officers to request you as a mentor.</p>
                                </div>
                                <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isMentor ? 'bg-green-600' : 'bg-gray-200'}`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isMentor ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </div>
                            </label>
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-2">My Expertise</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(ExpertiseTagEnum).map(tag => (
                                        <button key={tag} onClick={() => handleTagChange(tag)} className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors ${expertiseTags.has(tag) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                         <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                         <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Save Changes</button>
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