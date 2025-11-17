import React, { useState, useMemo, useCallback } from 'react';
import { User, PaymentStage, Farmer, SubsidyPayment, ActivityType } from '../types';
import { SubsidyPaymentModel, ActivityLogModel } from '../db';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import { GEO_DATA } from '../data/geoData';
import { getGeoName, formatCurrency } from '../lib/utils';
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

type SubsidyStatusInfo = {
    status: 'Paid' | 'Eligible' | 'Pending' | 'Not Yet Eligible' | 'N/A';
    payment?: SubsidyPaymentModel;
};

type FarmerWithStatuses = {
    farmer: Farmer;
    statuses: Record<PaymentStage, SubsidyStatusInfo>;
};

const SubsidyManagementPage: React.FC<SubsidyManagementPageProps> = ({ farmers, payments, currentUser, onBack, database, setNotification }) => {
    const [filters, setFilters] = useState({ district: '', mandal: '', subsidyStage: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [paymentModalInfo, setPaymentModalInfo] = useState<{ isOpen: boolean; farmer?: Farmer; stage?: PaymentStage }>({ isOpen: false });
    const rowsPerPage = 10;
    
    const mandals = useMemo(() => {
        if (!filters.district) return [];
        return GEO_DATA.find(d => d.code === filters.district)?.mandals || [];
    }, [filters.district]);
    
    const paymentsByFarmerId = useMemo(() => {
        return payments.reduce((acc, p) => {
            if (!acc[p.farmerId]) {
                acc[p.farmerId] = [];
            }
            acc[p.farmerId].push(p);
            return acc;
        }, {} as Record<string, SubsidyPaymentModel[]>);
    }, [payments]);

    const farmersWithStatuses: FarmerWithStatuses[] = useMemo(() => {
        return farmers.map(farmer => {
            const farmerPayments = paymentsByFarmerId[farmer.id] || [];
            const statuses: any = {};
            const now = new Date();
            const plantationDate = farmer.plantationDate ? new Date(farmer.plantationDate) : null;

            TABLE_STAGES.forEach(stage => {
                const paid = farmerPayments.find(p => p.paymentStage === stage);
                if (paid) {
                    statuses[stage] = { status: 'Paid', payment: paid };
                    return;
                }
                
                if (!plantationDate) {
                    statuses[stage] = { status: 'N/A' };
                    return;
                }
                
                const yearMatch = stage.match(/Year (\d)/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[1], 10);
                    const eligibilityStartDate = new Date(plantationDate);
                    eligibilityStartDate.setFullYear(eligibilityStartDate.getFullYear() + (year - 1));
                    
                    if (now >= eligibilityStartDate) {
                        statuses[stage] = { status: 'Eligible' };
                    } else {
                        statuses[stage] = { status: 'Not Yet Eligible' };
                    }
                } else {
                    statuses[stage] = { status: 'Pending' };
                }
            });
            return { farmer, statuses };
        });
    }, [farmers, paymentsByFarmerId]);
    
    const filteredFarmers = useMemo(() => {
        return farmersWithStatuses.filter(({ farmer, statuses }) => {
            if (filters.district && farmer.district !== filters.district) return false;
            if (filters.mandal && farmer.mandal !== filters.mandal) return false;
            if (filters.subsidyStage && statuses[filters.subsidyStage as PaymentStage]?.status !== 'Eligible') return false;
            return true;
        });
    }, [farmersWithStatuses, filters]);

    const stats = useMemo(() => {
        let eligibleCount = 0;
        let awaitingFarmers = new Set<string>();

        filteredFarmers.forEach(({ farmer, statuses }) => {
            let isAwaiting = false;
            TABLE_STAGES.forEach(stage => {
                if (statuses[stage]?.status === 'Eligible') {
                    eligibleCount++;
                    isAwaiting = true;
                }
            });
            if (isAwaiting) {
                awaitingFarmers.add(farmer.id);
            }
        });
        
        const filteredFarmerIds = new Set(filteredFarmers.map(f => f.farmer.id));
        const disbursedAmount = payments
            .filter(p => filteredFarmerIds.has(p.farmerId))
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            eligiblePayments: eligibleCount.toLocaleString(),
            disbursedAmount: formatCurrency(disbursedAmount),
            farmersAwaiting: awaitingFarmers.size.toLocaleString(),
        };
    }, [filteredFarmers, payments]);

    const paginatedFarmers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return filteredFarmers.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredFarmers, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(filteredFarmers.length / rowsPerPage);

    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleRecordPayment = (farmer: Farmer, statusInfo: SubsidyStatusInfo, stage: PaymentStage) => {
        if (statusInfo.status === 'Eligible') {
            setPaymentModalInfo({ isOpen: true, farmer, stage });
        }
    };
    
    // FIX: Removed explicit 'any' types from create() callbacks and the database.write() callback to allow for proper type inference, resolving TypeScript errors.
    const handleSavePayment = useCallback(async (paymentData: Omit<SubsidyPayment, 'syncStatus' | 'createdAt' | 'createdBy' | 'farmerId' | 'tenantId'>) => {
        if (!paymentModalInfo.farmer) return;
        try {
            await database.write(async () => {
                // FIX: Untyped function calls may not accept type arguments. Removed generic type argument.
                await database.get('subsidy_payments').create(rec => {
                    Object.assign(rec, {
                        ...paymentData,
                        farmerId: paymentModalInfo.farmer!.id,
                        createdBy: currentUser.id,
                        syncStatusLocal: 'pending',
                        tenantId: paymentModalInfo.farmer!.tenantId,
                    });
                });
                // FIX: Untyped function calls may not accept type arguments. Removed generic type argument.
                await database.get('activity_logs').create(log => {
                    Object.assign(log, {
                        farmerId: paymentModalInfo.farmer!.id,
                        activityType: ActivityType.PAYMENT_RECORDED,
                        description: `${paymentData.paymentStage} of ₹${paymentData.amount.toLocaleString()} recorded.`,
                        createdBy: currentUser.id,
                        tenantId: paymentModalInfo.farmer!.tenantId,
                    });
                });
            });
            setNotification({ message: 'Payment recorded successfully.', type: 'success' });
        } catch (error) {
            console.error("Failed to save payment:", error);
            setNotification({ message: 'Failed to save payment. Please try again.', type: 'error' });
        } finally {
            setPaymentModalInfo({ isOpen: false });
        }
    }, [database, currentUser, setNotification, paymentModalInfo.farmer]);

    const StatusCell: React.FC<{ info: SubsidyStatusInfo, onClick: () => void }> = ({ info, onClick }) => {
        const baseClass = "h-6 w-6 rounded-full mx-auto transition-transform hover:scale-125";
        switch (info.status) {
            case 'Paid': return <div className={`${baseClass} bg-green-500`} title={`Paid on ${new Date(info.payment!.paymentDate).toLocaleDateString()}`}></div>;
            case 'Eligible': return <button onClick={onClick} className={`${baseClass} bg-blue-500`} title="Eligible - Click to pay"></button>;
            case 'Pending': return <div className={`${baseClass} bg-orange-400`} title="Pending"></div>;
            case 'Not Yet Eligible': return <div className={`${baseClass} bg-gray-300`} title="Not Yet Eligible"></div>;
            default: return <div className={`${baseClass} bg-gray-100 border`} title="N/A"></div>;
        }
    };
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Subsidy Eligibility Dashboard</h1>
                        <p className="text-gray-500">Track and manage subsidy payments for all farmers.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCard title="Eligible Payments" value={stats.eligiblePayments} icon={<svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} />
                    <StatCard title="Farmers Awaiting Payment" value={stats.farmersAwaiting} icon={<svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path></svg>} />
                    <StatCard title="Total Disbursed (Filtered)" value={stats.disbursedAmount} icon={<svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>} />
                </div>
                
                 <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <CustomSelect label="District" options={[{value: '', label: 'All Districts'}, ...Object.values(GEO_DATA).map(d => ({value: d.code, label: d.name}))]} value={filters.district} onChange={v => handleFilterChange('district', v)} />
                        <CustomSelect label="Mandal" options={[{value: '', label: 'All Mandals'}, ...mandals.map(m => ({value: m.code, label: m.name}))]} value={filters.mandal} onChange={v => handleFilterChange('mandal', v)} disabled={!filters.district} />
                        <CustomSelect label="Eligibility Status" options={[{value: '', label: 'All'}, {value: 'Eligible', label: 'Eligible for Payment'}]} value={filters.subsidyStage} onChange={v => handleFilterChange('subsidyStage', v)} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                    {TABLE_STAGES.map(stage => (
                                        <th key={stage} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase transform -rotate-45" style={{ whiteSpace: 'nowrap' }}>{stage}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedFarmers.map(({ farmer, statuses }) => (
                                    <tr key={farmer.id}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{farmer.fullName}</div>
                                            <div className="text-xs text-gray-500">{getGeoName('mandal', farmer)}, {getGeoName('district', farmer)}</div>
                                        </td>
                                        {TABLE_STAGES.map(stage => (
                                            <td key={stage} className="px-2 py-3 text-center">
                                                <StatusCell 
                                                    info={statuses[stage]} 
                                                    onClick={() => handleRecordPayment(farmer, statuses[stage], stage)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {filteredFarmers.length === 0 && (
                                    <tr>
                                        <td colSpan={TABLE_STAGES.length + 1} className="text-center py-10 text-gray-500">
                                            No farmers match the current criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                         <div className="px-6 py-4 flex items-center justify-between border-t">
                            <span className="text-sm text-gray-700">
                                Showing {Math.min(1 + (currentPage - 1) * rowsPerPage, filteredFarmers.length)} to {Math.min(currentPage * rowsPerPage, filteredFarmers.length)} of {filteredFarmers.length} farmers
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Prev</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {paymentModalInfo.isOpen && (
                <SubsidyPaymentForm 
                    onClose={() => setPaymentModalInfo({ isOpen: false })}
                    onSubmit={handleSavePayment}
                    initialStage={paymentModalInfo.stage}
                />
            )}
        </div>
    );
};

export default SubsidyManagementPage;
