import React, { useState, useMemo, useCallback } from 'react';
import { User, PaymentStage, Farmer } from '../types';
import { SubsidyPaymentModel } from '../db';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import { GEO_DATA } from '../data/geoData';

interface SubsidyManagementPageProps {
    farmers: Farmer[];
    payments: SubsidyPaymentModel[];
    currentUser: User;
    onBack: () => void;
    database: any;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-6">
        <div className="bg-green-100 p-4 rounded-full">{icon}</div>
        <div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-sm font-medium text-gray-500">{title}</p>
        </div>
    </div>
);

const SubsidyManagementPage: React.FC<SubsidyManagementPageProps> = ({ farmers, payments, currentUser, onBack, database, setNotification }) => {
    const [filters, setFilters] = useState({ district: '', mandal: '', subsidyStage: '', status: '' });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentContext, setPaymentContext] = useState<{ farmer: Farmer; stage: PaymentStage } | null>(null);
    
    // --- Filter Handlers & Derived Data ---
    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, subsidyStage: e.target.value, status: '' })); // Reset status when stage changes
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, district: e.target.value, mandal: '' }));
    };

    const clearFilters = () => {
        setFilters({ district: '', mandal: '', subsidyStage: '', status: '' });
    };

    const mandals = useMemo(() => {
        if (!filters.district) return [];
        const selectedDistrict = GEO_DATA.find(d => d.code === filters.district);
        return selectedDistrict?.mandals || [];
    }, [filters.district]);

    const statusOptions = useMemo(() => {
        if (!filters.subsidyStage) return [];
        switch (filters.subsidyStage) {
            case PaymentStage.Year1:
                return ['Paid', 'Pending'];
            case PaymentStage.Year2:
            case PaymentStage.Year3:
                return ['Paid', 'Eligible', 'Not Eligible'];
            case PaymentStage.Fertilizer:
                return ['Paid', 'Eligible'];
            default:
                return [];
        }
    }, [filters.subsidyStage]);

    const paymentsByFarmerId = useMemo(() => {
        const map = new Map<string, SubsidyPaymentModel[]>();
        payments.forEach(p => {
            const list = map.get(p.farmerId) || [];
            list.push(p);
            map.set(p.farmerId, list);
        });
        return map;
    }, [payments]);

    const handleSavePayment = useCallback(async (paymentData: any) => {
        if (!paymentContext) return;
        try {
            const paymentsCollection = database.get('subsidy_payments');
            await database.write(async () => {
                await paymentsCollection.create((rec: SubsidyPaymentModel) => {
                    rec.farmerId = paymentContext.farmer.id;
                    rec.paymentDate = paymentData.paymentDate;
                    rec.amount = paymentData.amount;
                    rec.utrNumber = paymentData.utrNumber;
                    rec.paymentStage = paymentData.paymentStage;
                    rec.notes = paymentData.notes;
                    rec.createdBy = currentUser.id;
                    rec.syncStatusLocal = 'pending';
                });
            });
            setNotification({ message: 'Payment recorded successfully.', type: 'success' });
            setShowPaymentModal(false);
            setPaymentContext(null);
        } catch (error) {
            console.error("Failed to save payment:", error);
            setNotification({ message: 'Failed to save payment. Please try again.', type: 'error' });
            setShowPaymentModal(false);
            setPaymentContext(null);
        }
    }, [database, currentUser.id, paymentContext, setNotification]);

    const processedData = useMemo(() => {
        return farmers
            .map(farmer => {
                const farmerPayments = paymentsByFarmerId.get(farmer.id) || [];
                const now = new Date();
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
                const plantationDate = farmer.plantationDate ? new Date(farmer.plantationDate) : null;

                const year1Payment = farmerPayments.find(p => p.paymentStage === PaymentStage.Year1);
                const year2Payment = farmerPayments.find(p => p.paymentStage === PaymentStage.Year2);
                const year3Payment = farmerPayments.find(p => p.paymentStage === PaymentStage.Year3);
                const fertilizerPayment = farmerPayments.find(p => p.paymentStage === PaymentStage.Fertilizer);

                const isEligibleForYear2 = year1Payment && plantationDate && plantationDate <= oneYearAgo;
                const isEligibleForYear3 = year2Payment && plantationDate && plantationDate <= twoYearsAgo;

                return {
                    farmer,
                    payments: {
                        [PaymentStage.Year1]: { payment: year1Payment, status: year1Payment ? 'Paid' : 'Pending' },
                        [PaymentStage.Year2]: { payment: year2Payment, status: year2Payment ? 'Paid' : (isEligibleForYear2 ? 'Eligible' : 'Not Eligible') },
                        [PaymentStage.Year3]: { payment: year3Payment, status: year3Payment ? 'Paid' : (isEligibleForYear3 ? 'Eligible' : 'Not Eligible') },
                        [PaymentStage.Fertilizer]: { payment: fertilizerPayment, status: fertilizerPayment ? 'Paid' : 'Eligible' }
                    }
                };
            })
            .filter(item => {
                if (filters.district && item.farmer.district !== filters.district) return false;
                if (filters.mandal && item.farmer.mandal !== filters.mandal) return false;
                if (filters.subsidyStage && filters.status) {
                     if (item.payments[filters.subsidyStage as PaymentStage].status !== filters.status) return false;
                }
                return true;
            });
    }, [farmers, paymentsByFarmerId, filters]);
    
    const stats = useMemo(() => {
        const totalDisbursed = payments.reduce((sum, p) => sum + p.amount, 0);
        const year1PaidCount = new Set(payments.filter(p => p.paymentStage === PaymentStage.Year1).map(p => p.farmerId)).size;
        return { totalDisbursed, year1PaidCount };
    }, [payments]);

    const openPaymentModal = (farmer: Farmer, stage: PaymentStage) => {
        setPaymentContext({ farmer, stage });
        setShowPaymentModal(true);
    };

    const StatusCell: React.FC<{ data: { payment?: SubsidyPaymentModel; status: string }, stage: PaymentStage, farmer: Farmer }> = ({ data, stage, farmer }) => {
        if (data.status === 'Paid' && data.payment) {
            return <div className="text-center"><div className="text-green-700 font-semibold">Paid</div><div className="text-xs text-gray-500">{new Date(data.payment.paymentDate).toLocaleDateString()}</div></div>;
        }
        if (data.status === 'Eligible' || (stage === PaymentStage.Year1 && data.status === 'Pending')) {
            return <button onClick={() => openPaymentModal(farmer, stage)} className="w-full text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Record</button>;
        }
        return <span className="text-xs text-gray-400">Not Eligible</span>;
    };


    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Subsidy Management</h1>
                        <p className="text-gray-500">Track and manage subsidy payments across all farmers.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                     <StatCard title="Total Subsidy Disbursed" value={`₹${stats.totalDisbursed.toLocaleString()}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                     <StatCard title="Total Farmers Paid (Yr 1)" value={stats.year1PaidCount} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                </div>
                
                 {/* Filter Bar */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <select id="district" name="district" value={filters.district} onChange={handleDistrictChange} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="">All Districts</option>
                                {GEO_DATA.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="mandal" className="block text-sm font-medium text-gray-700 mb-1">Mandal</label>
                            <select id="mandal" name="mandal" value={filters.mandal} onChange={handleFilterChange} disabled={!filters.district} className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100">
                                <option value="">All Mandals</option>
                                {mandals.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="subsidyStage" className="block text-sm font-medium text-gray-700 mb-1">Subsidy Stage</label>
                            <select id="subsidyStage" name="subsidyStage" value={filters.subsidyStage} onChange={handleStageChange} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="">All Stages</option>
                                {Object.values(PaymentStage).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="status" name="status" value={filters.status} onChange={handleFilterChange} disabled={!filters.subsidyStage} className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100">
                                <option value="">All</option>
                                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                             <button onClick={clearFilters} className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition font-semibold">
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                 <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b">
                        <h3 className="text-xl font-bold text-gray-800">Farmer Subsidy Status</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plantation Date</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Year 1</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Year 2</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Year 3</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Fertilizer</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {processedData.length > 0 ? processedData.map(({ farmer, payments }) => (
                                    <tr key={farmer.id}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{farmer.fullName}</td>
                                        <td className="px-4 py-3 text-sm">{farmer.plantationDate ? new Date(farmer.plantationDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm"><StatusCell data={payments[PaymentStage.Year1]} stage={PaymentStage.Year1} farmer={farmer} /></td>
                                        <td className="px-4 py-3 text-sm"><StatusCell data={payments[PaymentStage.Year2]} stage={PaymentStage.Year2} farmer={farmer} /></td>
                                        <td className="px-4 py-3 text-sm"><StatusCell data={payments[PaymentStage.Year3]} stage={PaymentStage.Year3} farmer={farmer} /></td>
                                        <td className="px-4 py-3 text-sm"><StatusCell data={payments[PaymentStage.Fertilizer]} stage={PaymentStage.Fertilizer} farmer={farmer} /></td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-gray-500">
                                            No farmers match the current filter criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </div>
            {showPaymentModal && paymentContext && (
                <SubsidyPaymentForm 
                    onClose={() => setShowPaymentModal(false)}
                    onSubmit={handleSavePayment}
                />
            )}
        </div>
    );
};

export default SubsidyManagementPage;
