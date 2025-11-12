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

type SubsidyStatusInfo = {
    status: 'Paid' | 'Eligible' | 'Pending' | 'Not Yet Eligible' | 'N/A';
    payment?: SubsidyPaymentModel;
};

type FarmerWithStatuses = {
    farmer: Farmer;
    statuses: Record<PaymentStage, SubsidyStatusInfo>;
};

const SubsidyManagementPage: React.FC<SubsidyManagementPageProps> = ({ farmers, payments, currentUser, onBack, database, setNotification }) => {
    // FIX: Corrected a syntax error in the `useState` hook for filters. The shorthand property 'subsidy' was replaced with 'subsidyStage: ""' to provide a valid key-value pair and a more descriptive filter name.
    const [filters, setFilters] = useState({ district: '', mandal: '', subsidyStage: '' });
    const [currentPage, setCurrentPage] = useState(1);
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


    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const StatusCell: React.FC<{ info: SubsidyStatusInfo, onClick: () => void }> = ({ info, onClick }) => {
        const baseClass = "h-6 w-6 rounded-full mx-auto cursor-pointer transition-transform hover:scale-125";
        switch (info.status) {
            case 'Paid': return <div className={`${baseClass} bg-green-500`} title={`Paid on ${new Date(info.payment!.paymentDate).toLocaleDateString()}`}></div>;
            case 'Eligible': return <div onClick={onClick} className={`${baseClass} bg-blue-500`} title="Eligible - Click to pay"></div>;
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
                                {/* Table body will be implemented in a future phase */}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubsidyManagementPage;