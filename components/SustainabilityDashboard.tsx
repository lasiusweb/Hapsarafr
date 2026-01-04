import React, { useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { SustainabilityActionModel } from '../db';
import { useNavigate } from 'react-router-dom';

interface SustainabilityDashboardProps {
    onBack: () => void;
}

const SustainabilityDashboard: React.FC<SustainabilityDashboardProps> = ({ onBack }) => {
    const database = useDatabase();
    const navigate = useNavigate();

    // Fetch actions
    // @ts-ignore
    const actions = useQuery<SustainabilityActionModel>(database.get<SustainabilityActionModel>('sustainability_actions').query());

    const stats = useMemo(() => {
        const verifiedCount = actions.filter(a => a.status === 'verified').length;
        const pendingCount = actions.filter(a => a.status === 'pending').length;

        // Mock carbon calculation
        const carbonSequestered = verifiedCount * 0.5; // tons (placeholder logic)

        return { verifiedCount, pendingCount, carbonSequestered };
    }, [actions]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Sustainability Dashboard</h1>
                        <p className="text-gray-500">Track eco-friendly practices and carbon credits.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                        <p className="text-sm font-medium text-gray-500">Verified Actions</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{stats.verifiedCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                        <p className="text-sm font-medium text-gray-500">Pending Verification</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-gray-500">Est. Carbon Sequestered</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{stats.carbonSequestered} <span className="text-sm font-normal text-gray-500">tons</span></p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Actions Log</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {actions.map(action => (
                                    <tr key={action.id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{action.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{action.actionType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${action.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {action.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(action.submittedAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {actions.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No sustainability actions recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SustainabilityDashboard;
