import React from 'react';

interface AcceptInvitationProps {
    invitationCode: string;
    onAccept: () => void;
}

const AcceptInvitation: React.FC<AcceptInvitationProps> = ({ invitationCode, onAccept }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-4">Accept Invitation</h1>
                <p className="mb-6">You have been invited to join Hapsara. Code: {invitationCode}</p>
                <button onClick={onAccept} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Accept & Join
                </button>
            </div>
        </div>
    );
};

export default AcceptInvitation;