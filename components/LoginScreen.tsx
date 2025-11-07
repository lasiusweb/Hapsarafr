import React, { useState } from 'react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (userId: string) => void;
  users: User[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>(users[1]?.id || users[0]?.id || '');

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUserId) {
            onLogin(selectedUserId);
        } else {
            alert('Please select a user to log in.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/>
                        </svg>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara</h1>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-700">Select User Profile</h2>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="user-select" className="block text-sm font-medium text-gray-700">Log in as:</label>
                        <select
                            id="user-select"
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="mt-1 w-full p-3 border border-gray-300 rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-300">
                        Log In
                    </button>
                </form>
            </div>
             <footer className="mt-12 text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} Hapsara. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LoginScreen;
