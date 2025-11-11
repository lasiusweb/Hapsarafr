import React from 'react';

interface SustainabilityDashboardProps {
    onBack: () => void;
}

const SustainabilityDashboard: React.FC<SustainabilityDashboardProps> = ({ onBack }) => {

    // This is a placeholder component.
    // The full implementation will require fetching data for a specific farmer.

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Sustainability Dashboard</h1>
                        <p className="text-gray-500">Track your progress, log inputs, and see the value of sustainable farming.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800">Feature Coming Soon</h2>
                    <p className="mt-2 text-gray-600">
                        This dashboard will soon allow you to track your sustainability practices, view cost savings, and generate certificates for your verified efforts.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default SustainabilityDashboard;
