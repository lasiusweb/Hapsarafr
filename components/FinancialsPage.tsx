import React from 'react';
import { User, Farmer } from '../types';

interface FinancialsPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
    currentUser: User;
}

const FinancialsPage: React.FC<FinancialsPageProps> = ({ allFarmers, onBack, currentUser }) => {
    
    // In future phases, this page will fetch and display wallet balance,
    // a list of transactions, and allow managing withdrawal accounts and initiating payouts.

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">My Wallet & Financials</h1>
                        <p className="text-gray-500">Manage your earnings, view transactions, and withdraw funds.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 2.01v.01M12 14v4m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 14c.65 0 1.252-.198 1.757-.522M4 9.562A4.98 4.98 0 006 12c0 .65.125 1.273.356 1.857m13.288-4.295A4.98 4.98 0 0118 12c0 .65-.125 1.273-.356 1.857m0 0a5.002 5.002 0 01-10.588 0" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800">Feature Coming Soon</h2>
                    <p className="mt-2 text-gray-600 max-w-xl mx-auto">
                        This section will soon be your financial hub. After your bank account is verified, you will be able to see your Hapsara Wallet balance, view detailed transaction histories, and withdraw your funds directly to your bank account with a single tap.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinancialsPage;