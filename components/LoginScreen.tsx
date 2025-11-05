import React from 'react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-3 mb-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/>
          </svg>
          <h1 className="text-3xl font-bold text-gray-800">Hapsara Farmer Registration</h1>
        </div>
        <h2 className="text-2xl font-semibold text-gray-700">Who's using the app?</h2>
        <p className="text-gray-500 mt-1">Please select your profile to continue.</p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => onLogin(user)}
            className="group cursor-pointer p-4 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center"
            role="button"
            aria-label={`Log in as ${user.name}`}
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full border-4 border-gray-200 group-hover:border-green-500 transition-colors"
            />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.role}</p>
          </div>
        ))}
      </div>
       <footer className="mt-12 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Hapsara. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LoginScreen;
