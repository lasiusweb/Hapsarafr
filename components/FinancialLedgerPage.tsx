import React, { useState, useMemo, useCallback } from 'react';
import { Farmer, ManualLedgerEntry, User, EntrySource } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, SubsidyPaymentModel, ResourceDistributionModel, ResourceModel, ManualLedgerEntryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { formatCurrency } from '../lib/utils';

interface FinancialLedgerPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
    currentUser: User;
}

const FinancialLedgerPage: React.FC<FinancialLedgerPageProps> = ({ allFarmers, onBack, currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    
    const farmerOptions = useMemo(() => allFarmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hap_id || 'N/A'})` })), [allFarmers]);
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Financial Ledger</h1>
                        <p className="text-gray-500">Track income and expenses for individual farmers.</p>
                    </div>
                     <div className="flex items-center gap-4">
                        <button 
                            onClick={() => alert("Tally export feature coming soon!")} 
                            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold text-sm"
                        >
                            Export to Tally (XML)
                        </button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <CustomSelect label="Select a Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a farmer to view their ledger --" />
                </div>
                
                <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold">Ledger Details Coming Soon</h2>
                    <p className="mt-2">Select a farmer to view their detailed transaction history, including subsidy payments and expenses.</p>
                </div>
            </div>
        </div>
    );
};

export default FinancialLedgerPage;
