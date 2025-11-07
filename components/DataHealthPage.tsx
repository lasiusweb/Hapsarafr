import React, { useState, useMemo } from 'react';
import { Farmer, FarmerStatus } from '../types';

interface DataHealthPageProps {
    allFarmers: Farmer[];
    onNavigate: (path: string) => void;
    onBack: () => void;
}

const PLANT_DENSITY_PER_ACRE = 57;
const DENSITY_TOLERANCE = 0.25; // 25% tolerance

interface HealthCheckResult {
    title: string;
    description: string;
    farmers: Farmer[];
    icon: React.ReactNode;
}

const AccordionCard: React.FC<{ result: HealthCheckResult; onNavigate: (path: string) => void; }> = ({ result, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasIssues = result.farmers.length > 0;

    return (
        <div className={`bg-white rounded-lg shadow-md ${hasIssues ? '' : 'opacity-70'}`}>
            <button
                onClick={() => hasIssues && setIsOpen(!isOpen)}
                className="w-full p-6 text-left flex items-center gap-6"
                disabled={!hasIssues}
                aria-expanded={isOpen}
            >
                {result.icon}
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{result.title}</h3>
                    <p className="text-sm text-gray-500">{result.description}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-4 py-1.5 text-lg font-bold rounded-full ${hasIssues ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.farmers.length}
                    </span>
                    {hasIssues && (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </button>
            {isOpen && hasIssues && (
                <div className="border-t px-6 pb-6">
                    <ul className="divide-y max-h-60 overflow-y-auto mt-4">
                        {result.farmers.map(farmer => (
                            <li key={farmer.id} className="py-2 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">{farmer.fullName}</p>
                                    <p className="text-sm font-mono text-gray-500">{farmer.farmerId}</p>
                                </div>
                                <button onClick={() => onNavigate(`farmer-details/${farmer.id}`)} className="text-sm font-semibold text-green-600 hover:underline">
                                    View &rarr;
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const DataHealthPage: React.FC<DataHealthPageProps> = ({ allFarmers, onNavigate, onBack }) => {

    const healthChecks = useMemo((): HealthCheckResult[] => {
        const missingBankDetails = allFarmers.filter(f => !f.bankAccountNumber || !f.ifscCode);
        const unverifiedAccounts = allFarmers.filter(f => f.bankAccountNumber && !f.accountVerified);
        const missingPlantationDate = allFarmers.filter(f => f.status === FarmerStatus.Planted && !f.plantationDate);
        const missingPhoto = allFarmers.filter(f => !f.photo);
        const incorrectPlantDensity = allFarmers.filter(f => {
            if (!f.approvedExtent || !f.numberOfPlants || f.approvedExtent < 0.5) return false;
            const expectedPlants = f.approvedExtent * PLANT_DENSITY_PER_ACRE;
            const lowerBound = expectedPlants * (1 - DENSITY_TOLERANCE);
            const upperBound = expectedPlants * (1 + DENSITY_TOLERANCE);
            return f.numberOfPlants < lowerBound || f.numberOfPlants > upperBound;
        });

        return [
            {
                title: "Missing Bank Details",
                description: "Farmers missing an account number or IFSC code, blocking subsidy payments.",
                farmers: missingBankDetails,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
            },
            {
                title: "Unverified Bank Accounts",
                description: "Accounts that have been entered but not yet marked as verified.",
                farmers: unverifiedAccounts,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>,
            },
            {
                title: "Missing Plantation Date",
                description: "Farmers marked as 'Planted' but do not have a plantation date recorded.",
                farmers: missingPlantationDate,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
            },
            {
                title: "Missing Farmer Photo",
                description: "Registrations that were completed without capturing a farmer's photograph.",
                farmers: missingPhoto,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
            },
            {
                title: "Inconsistent Plant Density",
                description: "Number of plants seems incorrect for the approved land area.",
                farmers: incorrectPlantDensity,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2.5m3-2.5v-6.5m0 0a1.5 1.5 0 013 0v6.5m0 0a1.5 1.5 0 01-3 0m0 0a1.5 1.5 0 01-3 0m0 0a1.5 1.5 0 013 0" /></svg>,
            },
        ];
    }, [allFarmers]);


    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Data Health</h1>
                        <p className="text-gray-500">Review and resolve potential data quality issues.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="space-y-4">
                    {healthChecks.map(result => (
                        <AccordionCard key={result.title} result={result} onNavigate={onNavigate} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DataHealthPage;
