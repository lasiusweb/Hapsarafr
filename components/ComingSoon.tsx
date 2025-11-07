import React from 'react';

interface ComingSoonProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onBack: () => void;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description, icon, onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-white rounded-lg shadow-md">
            <div className="p-6 bg-green-100 rounded-full mb-6">
                {icon}
            </div>
            <h1 className="text-4xl font-bold text-gray-800">Coming Soon</h1>
            <h2 className="text-xl font-semibold text-gray-600 mt-2">{title}</h2>
            <p className="text-gray-500 mt-4 max-w-lg">{description}</p>
            <button
                onClick={onBack}
                className="mt-8 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold"
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default ComingSoon;
