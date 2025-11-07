import React, { useState, useMemo, useCallback } from 'react';
import { User, PaymentStage, Farmer } from '../types';
import { SubsidyPaymentModel } from '../db';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import { GEO_DATA } from '../data/geoData';
import { getGeoName } from '../lib/utils';
import CustomSelect from './CustomSelect';

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
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
    </div>
);

// Define the stages to be displayed in the table
const TABLE_STAGES: PaymentStage[] = [
    PaymentStage.MaintenanceYear1, PaymentStage.MaintenanceYear2, PaymentStage.MaintenanceYear3, PaymentStage.MaintenanceYear4,
    PaymentStage.IntercroppingYear1, PaymentStage.IntercroppingYear2, PaymentStage.IntercroppingYear3, PaymentStage.IntercroppingYear4,
];

const SubsidyManagementPage: React.FC<SubsidyManagementPageProps> = ({ farmers, payments, currentUser, onBack, database, setNotification }) => {
    const [filters, setFilters] = useState({ district: '', mandal: '', subsidyStage: '', status: '' });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentContext, setPaymentContext] = useState<{ farmer: Farmer; stage: PaymentStage } | null>(null);
    
    // --- Filter Handlers & Derived Data ---
    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({...prev, [name]: value}));
        if(name === 'district') setFilters(prev => ({...prev, mandal: ''}));
    }
    
    const clearFilters = () => {
        setFilters({ district: '', mandal: '', subsidyStage: '', status: '' });
    };

    const mandals = useMemo(() => {
        if (!filters.district) return [];
        const selectedDistrict = GEO_DATA.find(d => d.code === filters.district);
        return selectedDistrict?.mandals.map(m => ({ value: m.code, label: m.name })) || [];
    }, [filters.district]);

    const paymentsByFarmerId = useMemo(() => {
        const map = new Map<string, SubsidyPaymentModel[]>();
        payments.forEach(p => {
            const list = map.get(p.farmerId) || [];
            list.push(p);
            map.set(p.farmerId, list);
        });
        return map;
    }, [payments]);

    const processedData = useMemo(() => {
        const now = new Date();
        const yearsAgo = (years: number) => new Date(now.getFullYear() - years, now.getMonth(), now.getDate());

        return farmers
            .map(farmer => {
                const farmerPayments = paymentsByFarmerId.get(farmer.id) || [];
                const plantationDate = farmer.plantationDate ? new Date(farmer.plantationDate) : null;

                const getStatus = (stage: PaymentStage, eligibilityDate: Date | null, previousStagePayment?: SubsidyPaymentModel) => {
                    const paid = farmerPayments.find(p => p.paymentStage === stage);
                    if (paid) return { status: 'Paid', payment: paid };
                    
                    if (!plantationDate) return { status: 'N/A' };
                    
                    // For Year 1 stages, eligibility starts from plantation date itself
                    if (previousStagePayment === undefined) { 
                        return { status: 'Pending' };
                    }
                    
                    // For subsequent years, requires previous payment AND time eligibility
                    if (previousStagePayment && eligibilityDate && plantationDate <= eligibilityDate) {
                        return { status: 'Eligible' };
                    }

                    return { status: 'Not Yet Eligible' };
                };
                
                const maintenancePayments = {
                    y1: farmerPayments.find(p => p.paymentStage === PaymentStage.MaintenanceYear1),
                    y2: farmerPayments.find(p => p.paymentStage === PaymentStage.MaintenanceYear2),
                    y3: farmerPayments.find(p => p.paymentStage === PaymentStage.MaintenanceYear3),
                };
                const intercroppingPayments = {
                    y1: farmerPayments.find(p => p.paymentStage === PaymentStage.IntercroppingYear1),
                    y2: farmerPayments.find(p => p.paymentStage === PaymentStage.IntercroppingYear2),
                    y3: farmerPayments.find(p => p.paymentStage === PaymentStage.IntercroppingYear3),
                };

                const statuses = {
                    [PaymentStage.MaintenanceYear1]: getStatus(PaymentStage.MaintenanceYear1, null),
                    [PaymentStage.MaintenanceYear2]: getStatus(PaymentStage.MaintenanceYear2, yearsAgo(1), maintenancePayments.y1),
                    [PaymentStage.MaintenanceYear3]: getStatus(PaymentStage.MaintenanceYear3, yearsAgo(2), maintenancePayments.y2),
                    [PaymentStage.MaintenanceYear4]: getStatus(PaymentStage.MaintenanceYear4, yearsAgo(3), maintenancePayments.y3),
                    [PaymentStage.IntercroppingYear1]: getStatus(PaymentStage.IntercroppingYear1, null),
                    [PaymentStage.IntercroppingYear2]: getStatus(PaymentStage.IntercroppingYear2, yearsAgo(1), intercroppingPayments.y1),
                    [PaymentStage.IntercroppingYear3]: getStatus(PaymentStage.IntercroppingYear3, yearsAgo(2), intercroppingPayments.y2),
                    [PaymentStage.IntercroppingYear4]: getStatus(PaymentStage.IntercroppingYear4, yearsAgo(3), intercroppingPayments.y3),
                };

                return { farmer, statuses };
            })
            .filter(item => {
                if (filters.district && item.farmer.district !== filters.district) return false;
                if (filters.mandal && item.farmer.mandal !== filters.mandal) return false;
                if (filters.subsidyStage && filters.status) {
                    const stage = filters.subsidyStage as keyof typeof item.statuses;
                    if (item.statuses[stage]?.status !== filters.status) return false;
                }
                return true;
            });
    }, [farmers, paymentsByFarmerId, filters]);
    
    const stats = useMemo(() => {
        const totalDisbursed = payments.reduce((sum, p) => sum + p.amount, 0);
        const fourYearsAgo = new Date();
        fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
        const farmersInGestation = farmers.filter(f => f.plantationDate && new Date(f.plantationDate) > fourYearsAgo).length;

        const paymentsToProcess = processedData.reduce((count, item) => {
            const eligibleOrPending = Object.values(item.statuses).some(s => s.status === 'Eligible' || s.status === 'Pending');
            return count + (eligibleOrPending ? 1 : 0);
        }, 0);
        
        return { totalDisbursed, farmersInGestation, paymentsToProcess };
    }, [payments, farmers, processedData]);
    
    const handleSavePayment = useCallback(async (paymentData: any) => {
        if (!paymentContext) return;
        try {
            await database.write(async (writer: any) => {
                await database.get('subsidy_payments').create((rec: SubsidyPaymentModel) => {
                    rec.farmerId = paymentContext.farmer.id;
                    rec.paymentDate = paymentData.paymentDate;
                    rec.amount = paymentData.amount;
                    rec.utrNumber = paymentData.utrNumber;
                    rec.paymentStage = paymentData.paymentStage;
                    rec.notes = paymentData.notes;
                    rec.createdBy = currentUser.id;
                    rec.syncStatusLocal = 'pending';
                    rec.tenantId = paymentContext.farmer.tenantId;
                });
            });
            setNotification({ message: 'Payment recorded successfully.', type: 'success' });
        } catch (error) {
            console.error("Failed to save payment:", error);
            setNotification({ message: 'Failed to save payment. Please try again.', type: 'error' });
        } finally {
            setShowPaymentModal(false);
            setPaymentContext(null);
        }
    }, [database, currentUser.id, paymentContext, setNotification]);
    
    const openPaymentModal = (farmer: Farmer, stage: PaymentStage) => {
        setPaymentContext({ farmer, stage });
        setShowPaymentModal(true);
    };

    const StatusCell: React.FC<{ data: { status: string; payment?: SubsidyPaymentModel }; stage: PaymentStage; farmer: Farmer }> = ({ data, stage, farmer }) => {
        if (data.status === 'Paid' && data.payment) {
            return <div className="text-center"><div className="text-green-700 font-semibold">Paid</div><div className="text-xs text-gray-500" title={new Date(data.payment.paymentDate).toLocaleDateString()}>{data.payment.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div></div>;
        }
        if (data.status === 'Eligible' || data.status === 'Pending') {
            return <button onClick={() => openPaymentModal(farmer, stage)} className="w-full text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Record</button>;
        }
        return <span className="text-xs text-gray-400">{data.status}</span>;
    };
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="mx-auto" style={{maxWidth: '1600px'}}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Subsidy Management Dashboard</h1>
                        <p className="text-gray-500">Track and manage subsidy payments across all farmers.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                     <StatCard title="Total Subsidy Disbursed" value={stats.totalDisbursed.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                     <StatCard title="Farmers in Gestation Period" value={stats.farmersInGestation} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                     <StatCard title="Payments to Process" value={stats.paymentsToProcess} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <CustomSelect options={[{ value: '', label: 'All Districts' }, ...GEO_DATA.map(d => ({ value: d.code, label: d.name }))]} value={filters.district} onChange={v => handleFilterChange('district', v)} placeholder="All Districts" />
                        <CustomSelect options={[{ value: '', label: 'All Mandals' }, ...mandals]} value={filters.mandal} onChange={v => handleFilterChange('mandal', v)} placeholder="All Mandals" disabled={!filters.district} />
                        <CustomSelect options={[{value: '', label: 'All Stages'}, ...Object.values(PaymentStage).map(s => ({value: s, label: s}))]} value={filters.subsidyStage} onChange={v => handleFilterChange('subsidyStage', v)} placeholder="All Stages" />
                        <CustomSelect options={[{value: '', label: 'All Statuses'}, ...['Paid', 'Eligible', 'Pending', 'Not Yet Eligible', 'N/A'].map(s => ({value: s, label: s}))]} value={filters.status} onChange={v => handleFilterChange('status', v)} placeholder="All Statuses" />
                        <button onClick={clearFilters} className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition font-semibold">Clear Filters</button>
                    </div>
                </div>

                 <div className="bg-white rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-48">Farmer</th>
                                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Plantation Date</th>
                                    {TABLE_STAGES.map(stage => <th key={stage} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap">{stage.replace('Maintenance', 'Maint.').replace('Intercropping', 'Intercrop.')}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {processedData.map(({ farmer, statuses }) => (
                                    <tr key={farmer.id}>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 w-48">
                                            <div className="truncate" title={farmer.fullName}>{farmer.fullName}</div>
                                            <div className="text-xs font-mono text-gray-500">{farmer.farmerId}</div>
                                        </td>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 w-28">{farmer.plantationDate ? new Date(farmer.plantationDate).toLocaleDateString() : 'N/A'}</td>
                                        {TABLE_STAGES.map(stage => (
                                            <td key={stage} className="px-2 py-4 whitespace-nowrap text-sm w-28">
                                                <StatusCell data={statuses[stage as keyof typeof statuses]!} stage={stage} farmer={farmer} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {processedData.length === 0 && <div className="text-center py-10 text-gray-500">No farmers match the current filter criteria.</div>}
                    </div>
                 </div>
            </div>
            {showPaymentModal && paymentContext && (
                <SubsidyPaymentForm 
                    onClose={() => {setShowPaymentModal(false); setPaymentContext(null);}}
                    onSubmit={handleSavePayment}
                    initialStage={paymentContext.stage}
                />
            )}
        </div>
    );
};

export default SubsidyManagementPage;
