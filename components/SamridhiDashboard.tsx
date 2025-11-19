
import React, { useState } from 'react';
import { User } from '../types';
import DealerInsights from './DealerInsights';

interface SamridhiDashboardProps {
    onBack: () => void;
    currentUser: User;
}

const SamridhiDashboard: React.FC<SamridhiDashboardProps> = ({ onBack, currentUser }) => {
    // For now, we assume only dealers access this. Later we can add a view for Farmers.
    // If user is farmer, show FarmerInsights (Placeholder).
    // If user is dealer (or admin mimicking dealer), show DealerInsights.

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-extrabold text-indigo-900 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Hapsara Samridhi
                    </h1>
                    <p className="text-xs text-indigo-600">Business Intelligence Suite</p>
                </div>
                <button onClick={onBack} className="text-sm font-semibold text-gray-500">Exit</button>
            </div>

            <div className="p-4">
                <DealerInsights currentUser={currentUser} />
            </div>
        </div>
    );
};

export default SamridhiDashboard;