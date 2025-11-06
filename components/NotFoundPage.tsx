import React from 'react';

const NotFoundPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h1 className="text-6xl font-bold text-green-600">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mt-4">Page Not Found</h2>
            <p className="text-gray-500 mt-2">Sorry, the page you are looking for does not exist.</p>
            <button
                onClick={onBack}
                className="mt-8 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
                Go to Dashboard
            </button>
        </div>
    );
};

export default NotFoundPage;
