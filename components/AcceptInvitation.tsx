import React, { useState, useEffect } from 'react';
import { Invitation, Group } from '../types';
import AvatarSelectionModal from './AvatarSelectionModal';

interface AcceptInvitationProps {
    groups: Group[];
    onAccept: (code: string, userDetails: { name: string; avatar: string; password: string }) => void;
    onBackToLogin: () => void;
    invitations: Invitation[];
}

const AcceptInvitation: React.FC<AcceptInvitationProps> = ({ groups, onAccept, onBackToLogin, invitations }) => {
    const [step, setStep] = useState<'enter_code' | 'create_profile'>('enter_code');
    const [invitationCode, setInvitationCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [validInvitation, setValidInvitation] = useState<Invitation | null>(null);

    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('https://terrigen-cdn-dev.marvel.com/content/prod/1x/003cap_ons_crd_03.jpg'); // Default avatar
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('invitation');
        if (codeFromUrl) {
            setInvitationCode(codeFromUrl);
        }
    }, []);

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const codeToValidate = invitationCode.trim();
        if (!codeToValidate) {
            setError("Please enter an invitation code.");
            return;
        }

        const invitation = invitations.find(inv => inv.id === codeToValidate);

        if (!invitation) {
            setError("Invalid invitation code.");
            return;
        }
        if (invitation.status !== 'pending') {
            setError("This invitation has already been used.");
            return;
        }
        if (new Date() > new Date(invitation.expiresAt)) {
            setError("This invitation has expired.");
            return;
        }

        setValidInvitation(invitation);
        setStep('create_profile');
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (validInvitation) {
            onAccept(validInvitation.id, { name, avatar, password });
        }
    };
    
    const invitedGroup = validInvitation ? groups.find(g => g.id === validInvitation.groupId) : null;

    if (step === 'create_profile') {
        return (
             <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                     <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome!</h2>
                     <p className="text-center text-gray-500 mb-6">Create your profile to join the team.</p>
                     
                     <div className="text-center mb-6 p-3 bg-green-50 rounded-md border border-green-200">
                         <p className="text-sm text-gray-600">You have been invited to join the group:</p>
                         <p className="font-semibold text-green-700">{invitedGroup?.name || 'Unknown Group'}</p>
                     </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                         <div className="flex flex-col items-center">
                            <div className="relative">
                                <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-gray-200" />
                                 <button type="button" onClick={() => setIsModalOpen(true)} className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full p-1.5 hover:bg-green-700">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-gray-700">Password</label>
                            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg"/>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg"/>
                        </div>
                        
                        {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                        
                        <button type="submit" className="w-full mt-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Complete Registration</button>
                    </form>
                     {isModalOpen && <AvatarSelectionModal currentAvatar={avatar} onSelect={(a) => { setAvatar(a); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} />}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
                 <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Accept Invitation</h2>
                 <p className="text-center text-gray-500 mb-6">Enter the invitation code you received.</p>
                <form onSubmit={handleCodeSubmit}>
                    <div>
                        <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700">Invitation Code</label>
                        <input type="text" id="invitationCode" value={invitationCode} onChange={e => setInvitationCode(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg font-mono" />
                    </div>
                     {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                    <button type="submit" className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Verify Code</button>
                </form>
                 <div className="text-center mt-4">
                     <button onClick={onBackToLogin} className="text-sm text-gray-600 hover:underline">Back to Login</button>
                 </div>
            </div>
        </div>
    );
};

export default AcceptInvitation;