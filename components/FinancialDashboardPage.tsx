import React, { useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { SubsidyPaymentModel, TenantModel } from '../db';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const FinancialDashboardPage: React.FC = () => {
    const database = useDatabase();
    const navigate = useNavigate();

    // Fetch Data using useQuery
    // @ts-ignore
    const payments = useQuery<SubsidyPaymentModel>(database.get<SubsidyPaymentModel>('subsidy_payments').query());
    // @ts-ignore
    const tenants = useQuery<TenantModel>(database.get<TenantModel>('tenants').query());

    const stats = useMemo(() => {
        const totalDisbursed = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingPayments = payments.filter(p => p.paymentStage !== 'completed').reduce((sum, p) => sum + p.amount, 0);
        const successfulCount = payments.filter(p => p.paymentStage === 'completed').length;

        return {
            totalDisbursed,
            pendingPayments,
            successfulCount,
            totalCount: payments.length
        };
    }, [payments]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Financial Dashboard</h1>
                        <p className="text-gray-500">Overview of subsidy disbursements and financial health.</p>
                    </div>
                    <button onClick={() => navigate('/financial-ledger')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        View Ledger
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <p className="text-sm font-medium text-gray-500">Total Disbursed</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalDisbursed)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                        <p className="text-3xl font-bold text-yellow-600 mt-2">{formatCurrency(stats.pendingPayments)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <p className="text-sm font-medium text-gray-500">Transactions</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{stats.successfulCount} / {stats.totalCount}</p>
                    </div>
                </div>

                {/* Tenant Credits (if applicable) */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Tenant Credit Balances</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Balance</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tenants.map(tenant => (
                                    <tr key={tenant.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tenant.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{tenant.subscriptionStatus}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{formatCurrency(tenant.creditBalance)}</td>
                                    </tr>
                                ))}
                                {tenants.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-4 text-gray-500">No active tenants found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialDashboardPage;
