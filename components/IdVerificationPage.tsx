import React, { useState, useMemo } from 'react';
import { Farmer } from '../types';
import { GEO_DATA } from '../data/geoData';

interface IdVerificationPageProps {
    allFarmers: Farmer[];
    onBack: () => void;
}

interface VerificationResult {
    farmer: Farmer;
    actualId: string;
    expectedId: string;
    isMatch: boolean;
}

const IdVerificationPage: React.FC<IdVerificationPageProps> = ({ allFarmers, onBack }) => {
    const [location, setLocation] = useState({ district: '', mandal: '', village: '' });
    const [results, setResults] = useState<VerificationResult[] | null>(null);
    const [summary, setSummary] = useState<{ total: number; matches: number; mismatches: number } | null>(null);

    const mandals = useMemo(() => {
        if (!location.district) return [];
        return GEO_DATA.find(d => d.code === location.district)?.mandals || [];
    }, [location.district]);

    const villages = useMemo(() => {
        if (!location.district || !location.mandal) return [];
        return mandals.find(m => m.code === location.mandal)?.villages || [];
    }, [location.district, location.mandal]);
    
    const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocation(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'district') {
                newState.mandal = '';
                newState.village = '';
            }
            if (name === 'mandal') {
                newState.village = '';
            }
            return newState;
        });
        setResults(null); // Clear results when location changes
        setSummary(null);
    };

    const handleVerify = () => {
        if (!location.district || !location.mandal || !location.village) {
            alert('Please select a district, mandal, and village.');
            return;
        }

        const farmersInVillage = allFarmers
            .filter(f => f.district === location.district && f.mandal === location.mandal && f.village === location.village)
            .sort((a, b) => new Date(a.registrationDate || a.createdAt).getTime() - new Date(b.registrationDate || b.createdAt).getTime());

        const verificationResults: VerificationResult[] = farmersInVillage.map((farmer, index) => {
            const seq = (index + 1).toString().padStart(3, '0');
            const expectedId = `${location.district}${location.mandal}${location.village}${seq}`;
            const actualId = farmer.hap_id || '';
            return {
                farmer,
                actualId,
                expectedId,
                isMatch: actualId === expectedId,
            };
        });
        
        const mismatches = verificationResults.filter(r => !r.isMatch).length;
        setSummary({
            total: verificationResults.length,
            matches: verificationResults.length - mismatches,
            mismatches: mismatches,
        });

        setResults(verificationResults);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">ID Verification Tool</h1>
                        <p className="text-gray-500">Verify the sequence and format of Hap IDs for a selected village.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <select id="district" name="district" value={location.district} onChange={handleLocationChange} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="">Select District</option>
                                {GEO_DATA.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="mandal" className="block text-sm font-medium text-gray-700 mb-1">Mandal</label>
                            <select id="mandal" name="mandal" value={location.mandal} onChange={handleLocationChange} disabled={!location.district} className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100">
                                <option value="">Select Mandal</option>
                                {mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                            <select id="village" name="village" value={location.village} onChange={handleLocationChange} disabled={!location.mandal} className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100">
                                <option value="">Select Village</option>
                                {villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <button onClick={handleVerify} disabled={!location.village} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-gray-400">
                                Verify IDs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results */}
                {results && summary && (
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-4 border-b">
                            <h3 className="text-xl font-bold text-gray-800">Verification Results</h3>
                            <div className="flex gap-4 text-sm mt-2">
                               <span>Total Farmers: <strong className="text-gray-900">{summary.total}</strong></span>
                               <span className="text-green-600">Correct IDs: <strong className="text-green-700">{summary.matches}</strong></span>
                               <span className="text-red-600">Mismatched IDs: <strong className="text-red-700">{summary.mismatches}</strong></span>
                            </div>
                        </div>

                        {summary.mismatches > 0 && (
                            <div className="p-4 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800">
                                <strong>Note:</strong> Hap IDs are permanent identifiers and cannot be changed. To correct a mismatched ID, the farmer record must be deleted and re-registered. This ensures data integrity.
                            </div>
                        )}
                        
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Hap ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Hap ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.map(res => (
                                        <tr key={res.farmer.id} className={!res.isMatch ? 'bg-red-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{res.farmer.fullName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(res.farmer.registrationDate || res.farmer.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">{res.actualId || 'Not Synced'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{res.expectedId}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {res.isMatch 
                                                    ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Match</span>
                                                    : <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Mismatch</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                           {results.length === 0 && (
                               <div className="text-center py-10 text-gray-500">
                                   <p>No farmers found in the selected village.</p>
                                </div>
                           )}
                        </div>
                    </div>
                )}
                 {!results && (
                     <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">Select a Village to Begin</h2>
                        <p className="mt-2">Choose a location from the dropdowns above and click "Verify IDs" to check the Hap ID sequence.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IdVerificationPage;