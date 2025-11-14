import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { UserModel, UserProfileModel, MentorshipModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, ExpertiseTagEnum } from '../types';

interface MentorshipPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const MentorshipPage: React.FC<MentorshipPageProps> = ({ onBack, currentUser, setNotification }) => {
    const [activeTab, setActiveTab] = useState<'find' | 'my' | 'requests'>('find');

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Mentorship Hub</h1>
                        <p className="text-gray-500">Connect with peers, share knowledge, and grow together.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>
                 <div className="bg-white rounded-lg shadow-xl p-2">
                    <div className="flex border-b">
                        <TabButton activeTab={activeTab} tab="find" setActiveTab={setActiveTab} label="Find a Mentor" />
                        <TabButton activeTab={activeTab} tab="my" setActiveTab={setActiveTab} label="My Mentorships" />
                        <TabButton activeTab={activeTab} tab="requests" setActiveTab={setActiveTab} label="Requests" />
                    </div>
                    <div className="p-6">
                        {activeTab === 'find' && <FindMentorTab currentUser={currentUser} setNotification={setNotification} />}
                        {activeTab === 'my' && <div className="text-center py-10 text-gray-500">Feature to manage your active mentorships is coming soon.</div>}
                        {activeTab === 'requests' && <div className="text-center py-10 text-gray-500">Feature to view and respond to mentorship requests is coming soon.</div>}
                    </div>
                 </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ activeTab: string, tab: string, setActiveTab: (tab: any) => void, label: string }> = ({ activeTab, tab, setActiveTab, label }) => (
    <button onClick={() => setActiveTab(tab)} className={`px-4 py-3 font-semibold ${activeTab === tab ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>{label}</button>
);


const FindMentorTab: React.FC<{ currentUser: User, setNotification: (n: any) => void }> = ({ currentUser, setNotification }) => {
    const database = useDatabase();
    
    // Find all UserProfile records for mentors, excluding the current user
    const mentorProfilesQuery = useMemo(() => database.get<UserProfileModel>('user_profiles').query(
        Q.where('is_mentor', true),
        Q.where('user_id', Q.notEq(currentUser.id))
    ), [database, currentUser.id]);
    const mentorProfiles = useQuery(mentorProfilesQuery);

    // Get the user IDs from those profiles
    const mentorUserIds = useMemo(() => mentorProfiles.map(p => p.userId), [mentorProfiles]);
    
    // Fetch the full User records for the mentors
    const mentorsQuery = useMemo(() => database.get<UserModel>('users').query(Q.where('id', Q.oneOf(mentorUserIds))), [database, mentorUserIds]);
    const mentors = useQuery(mentorsQuery);

    const handleRequest = useCallback(async (mentor: UserModel) => {
        try {
            await database.write(async () => {
                await database.get<MentorshipModel>('mentorships').create(m => {
                    m.mentorId = mentor.id;
                    m.menteeId = currentUser.id;
                    m.status = 'pending';
                });
            });
            setNotification({message: `Mentorship request sent to ${mentor.name}.`, type: 'success'});
        } catch (error) {
            console.error("Failed to send mentorship request:", error);
            setNotification({message: 'Failed to send request.', type: 'error'});
        }
    }, [database, currentUser.id, setNotification]);
    
    if (mentors.length === 0) {
        return <div className="text-center text-gray-500 py-10">No mentors available right now. Check back later!</div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map(mentor => {
                const profile = mentorProfiles.find(p => p.userId === mentor.id);
                let tags = [];
                try {
                    tags = profile ? JSON.parse(profile.expertiseTags || '[]') : [];
                } catch(e) { console.error("Error parsing tags", e)}
                
                return (
                    <div key={mentor.id} className="bg-white p-6 rounded-lg shadow-md border flex flex-col">
                        <div className="flex items-center gap-4 mb-4">
                            <img src={mentor.avatar} alt={mentor.name} className="w-16 h-16 rounded-full" />
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{mentor.name}</h3>
                            </div>
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-semibold text-sm text-gray-600 mb-2">Expertise:</h4>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag: ExpertiseTagEnum) => (
                                    <span key={tag} className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => handleRequest(mentor)} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">Request Mentorship</button>
                    </div>
                )
            })}
        </div>
    );
};


export default MentorshipPage;