
import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';
import { 
    FarmerModel, FarmPlotModel, SubsidyPaymentModel, ActivityLogModel, 
    AssistanceApplicationModel, TenantModel, TerritoryModel 
} from '../db';
import { 
    User, Farmer, FarmPlot, SubsidyPayment, PaymentStage, ActivityType, 
    Permission, AssistanceApplicationStatus, FarmerStatus 
} from '../types';
import { 
    farmerModelToPlain, farmPlotModelToPlain, subsidyPaymentModelToPlain, 
    formatCurrency, getGeoName 
} from '../lib/utils';

// Components
import PlotFormModal from './PlotFormModal';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import ConfirmationModal from './ConfirmationModal';
import StatusBadge from './StatusBadge';
import CoPilotSuggestions from './CoPilotSuggestions';
import KycOnboardingModal from './KycOnboardingModal';
import GranularConsentModal from './GranularConsentModal';
import RequestVisitModal from './RequestVisitModal';
import CropAssignmentModal from './CropAssignmentModal';
import ResourceRecommender from './ResourceRecommender';

interface FarmerDetailsPageProps {
    farmerId: string;
    users: User[];
    currentUser: User;
    onBack: () => void;
    permissions: Set<Permission>;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    allTenants: TenantModel[];
    allTerritories: TerritoryModel[];
}

const FarmerDetailsPage: React.FC<FarmerDetailsPageProps> = ({ 
    farmerId, users, currentUser, onBack, permissions, setNotification, allTenants 
}) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState<'overview' | 'plots' | 'subsidies' | 'activity' | 'kyc'>('overview');
    
    // Modals State
    const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
    const [selectedPlot, setSelectedPlot] = useState<FarmPlotModel | null>(null);
    const [isSubsidyModalOpen, setIsSubsidyModalOpen] = useState(false);
    const [selectedSubsidy, setSelectedSubsidy] = useState<SubsidyPaymentModel | null>(null);
    const [isKycModalOpen, setIsKycModalOpen] = useState(false);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
    const [isCropAssignmentModalOpen, setIsCropAssignmentModalOpen] = useState(false);
    const [plotForCropAssignment, setPlotForCropAssignment] = useState<FarmPlotModel | null>(null);

    // Data Queries
    const farmerModel = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('id', farmerId)), [database, farmerId]))[0];
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', farmerId), Q.sortBy('created_at', 'desc')), [database, farmerId]));
    const subsidies = useQuery(useMemo(() => database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('farmer_id', farmerId), Q.sortBy('payment_date', 'desc')), [database, farmerId]));
    const activities = useQuery(useMemo(() => database.get<ActivityLogModel>('activity_logs').query(Q.where('farmer_id', farmerId), Q.sortBy('created_at', 'desc')), [database, farmerId]));
    const assistanceApps = useQuery(useMemo(() => database.get<AssistanceApplicationModel>('assistance_applications').query(Q.where('farmer_id', farmerId)), [database, farmerId]));

    const farmer = useMemo(() => farmerModelToPlain(farmerModel), [farmerModel]);
    const plainPlots = useMemo(() => plots.map(p => farmPlotModelToPlain(p)!), [plots]);

    // Handlers
    const handleSavePlot = useCallback(async (data: any, mode: 'create' | 'edit') => {
        try {
            await database.write(async () => {
                if (mode === 'edit' && selectedPlot) {
                    await selectedPlot.update(p => {
                        p.name = data.name;
                        p.acreage = data.acreage;
                        p.soilType = data.soilType;
                        p.methodOfPlantation = data.methodOfPlantation;
                        p.plantType = data.plantType;
                        p.plantationDate = data.plantationDate;
                        p.isReplanting = data.isReplanting;
                        p.syncStatusLocal = 'pending';
                    });
                } else {
                    await database.get<FarmPlotModel>('farm_plots').create(p => {
                        p.farmerId = farmerId;
                        p.name = data.name;
                        p.acreage = data.acreage;
                        p.soilType = data.soilType;
                        p.methodOfPlantation = data.methodOfPlantation;
                        p.plantType = data.plantType;
                        p.plantationDate = data.plantationDate;
                        p.isReplanting = data.isReplanting;
                        p.syncStatusLocal = 'pending';
                        p.tenantId = currentUser.tenantId;
                    });
                }
            });
            setNotification({ message: 'Plot saved successfully.', type: 'success' });
            setIsPlotModalOpen(false);
            setSelectedPlot(null);
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to save plot.', type: 'error' });
        }
    }, [database, farmerId, currentUser.tenantId, selectedPlot, setNotification]);

    const handleDeletePlot = useCallback(async (plot: FarmPlotModel) => {
        if (window.confirm(`Are you sure you want to delete plot "${plot.name}"?`)) {
            try {
                await database.write(async () => {
                    await (plot as any).destroyPermanently();
                });
                setNotification({ message: 'Plot deleted.', type: 'success' });
            } catch (error) {
                setNotification({ message: 'Failed to delete plot.', type: 'error' });
            }
        }
    }, [database, setNotification]);

    const handleSaveSubsidy = useCallback(async (data: any) => {
        try {
            await database.write(async () => {
                if (selectedSubsidy) {
                    await selectedSubsidy.update(s => {
                        Object.assign(s, data);
                        s.syncStatusLocal = 'pending';
                    });
                } else {
                    await database.get<SubsidyPaymentModel>('subsidy_payments').create(s => {
                        s.farmerId = farmerId;
                        Object.assign(s, data);
                        s.createdBy = currentUser.id;
                        s.tenantId = currentUser.tenantId;
                        s.syncStatusLocal = 'pending';
                    });
                }
            });
            setNotification({ message: 'Subsidy payment recorded.', type: 'success' });
            setIsSubsidyModalOpen(false);
            setSelectedSubsidy(null);
        } catch (error) {
            setNotification({ message: 'Failed to record payment.', type: 'error' });
        }
    }, [database, farmerId, currentUser, selectedSubsidy, setNotification]);

    const handleOpenCropAssignment = (plot: FarmPlotModel) => {
        setPlotForCropAssignment(plot);
        setIsCropAssignmentModalOpen(true);
    };

    if (!farmer) return <div className="p-6 text-center">Loading farmer details...</div>;

    const userMap = new Map(users.map(u => [u.id, u.name]));

    return (
        <div className="bg-gray-50 min-h-full p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                {farmer.fullName}
                                <StatusBadge status={farmer.status as FarmerStatus} />
                            </h1>
                            <p className="text-sm text-gray-500">HAP ID: {farmer.hap_id || 'Pending Sync'} • {getGeoName('village', farmer)}, {getGeoName('mandal', farmer)}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsVisitModalOpen(true)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-semibold">Request Visit</button>
                        <button onClick={() => setIsConsentModalOpen(true)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-semibold">Data Consent</button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Profile & CoPilot */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <div className="text-center mb-4">
                                <img src={farmer.photo || 'https://via.placeholder.com/150'} alt={farmer.fullName} className="w-24 h-24 rounded-full mx-auto mb-2 object-cover border-2 border-gray-100" />
                                <p className="text-sm font-mono text-gray-500">{farmer.mobileNumber}</p>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Father/Husband</span><span className="font-medium">{farmer.fatherHusbandName}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Aadhaar</span><span className="font-medium">**** {farmer.aadhaarNumber.slice(-4)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Bank Account</span><span className={`font-medium ${farmer.accountVerified ? 'text-green-600' : 'text-yellow-600'}`}>{farmer.accountVerified ? 'Verified' : 'Unverified'}</span></div>
                            </div>
                             <div className="mt-6 pt-4 border-t">
                                <button onClick={() => setIsKycModalOpen(true)} className="w-full py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-sm font-semibold">Manage KYC & Wallet</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                             <CoPilotSuggestions farmer={farmer} plots={plainPlots} />
                        </div>

                        {/* Resource Recommender */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                            <ResourceRecommender farmer={farmer} plots={plainPlots} currentUser={currentUser} />
                        </div>
                    </div>

                    {/* Right Column: Tabs */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
                        <div className="flex border-b overflow-x-auto">
                            <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'overview' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Overview</button>
                            <button onClick={() => setActiveTab('plots')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'plots' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Farm Portfolio</button>
                            <button onClick={() => setActiveTab('subsidies')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'subsidies' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Subsidies</button>
                            <button onClick={() => setActiveTab('activity')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'activity' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Activity</button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs text-blue-600 uppercase font-bold">Total Land</p>
                                            <p className="text-2xl font-bold text-blue-900">{farmer.approvedExtent || 0} <span className="text-sm font-normal">Acres</span></p>
                                        </div>
                                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-xs text-green-600 uppercase font-bold">Total Plants</p>
                                            <p className="text-2xl font-bold text-green-900">{farmer.numberOfPlants || 0}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-2">Assistance Applications</h3>
                                        {assistanceApps.length > 0 ? (
                                            <ul className="space-y-2">
                                                {assistanceApps.map(app => (
                                                    <li key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                                                        <span className="font-medium text-gray-700">{app.schemeId}</span>
                                                        <StatusBadge status={app.status as any} />
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-gray-500 text-sm">No active applications.</p>}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'plots' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-800">Farm Plots ({plots.length})</h3>
                                        <button onClick={() => { setSelectedPlot(null); setIsPlotModalOpen(true); }} className="text-sm text-green-600 hover:underline font-semibold">+ Add Plot</button>
                                    </div>
                                    {plots.map(plot => (
                                        <div key={plot.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{plot.name}</h4>
                                                    <p className="text-sm text-gray-500">{plot.acreage} Acres • {plot.soilType || 'Unknown Soil'}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleOpenCropAssignment(plot)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">Assign Crop</button>
                                                    <button onClick={() => { setSelectedPlot(plot); setIsPlotModalOpen(true); }} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Edit</button>
                                                    <button onClick={() => handleDeletePlot(plot)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'subsidies' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-800">Subsidy History</h3>
                                        <button onClick={() => { setSelectedSubsidy(null); setIsSubsidyModalOpen(true); }} className="text-sm text-green-600 hover:underline font-semibold">+ Record Payment</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Stage</th>
                                                    <th className="px-4 py-2 text-right font-medium text-gray-500">Amount</th>
                                                    <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {subsidies.map(sub => (
                                                    <tr key={sub.id}>
                                                        <td className="px-4 py-2">{new Date(sub.paymentDate).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2">{sub.paymentStage}</td>
                                                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(sub.amount)}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button onClick={() => { setSelectedSubsidy(sub); setIsSubsidyModalOpen(true); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-800 mb-2">Activity Timeline</h3>
                                    <ul className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                        {activities.map(log => (
                                            <li key={log.id} className="ml-6 relative">
                                                <span className="absolute -left-[31px] flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full ring-4 ring-white">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                </span>
                                                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                                                    <p className="text-sm text-gray-800">{log.description}</p>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                                                        <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">{log.activityType.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isPlotModalOpen && <PlotFormModal onClose={() => setIsPlotModalOpen(false)} onSubmit={handleSavePlot} plot={selectedPlot} />}
            {isSubsidyModalOpen && <SubsidyPaymentForm onClose={() => setIsSubsidyModalOpen(false)} onSubmit={handleSaveSubsidy} existingPayment={selectedSubsidy} />}
            {isKycModalOpen && <KycOnboardingModal farmer={farmer} onClose={() => setIsKycModalOpen(false)} setNotification={setNotification} />}
            {isVisitModalOpen && <RequestVisitModal farmer={farmer} users={users} currentUser={currentUser} onClose={() => setIsVisitModalOpen(false)} onSave={async () => {}} />}
            {isConsentModalOpen && <GranularConsentModal farmer={farmer} tenant={allTenants.find(t => t.id === currentUser.tenantId) || { id: '', name: 'Unknown' }} onClose={() => setIsConsentModalOpen(false)} onSave={() => setIsConsentModalOpen(false)} isOpen={isConsentModalOpen} />}
            {isCropAssignmentModalOpen && plotForCropAssignment && (
                <CropAssignmentModal 
                    farmPlot={plotForCropAssignment} 
                    onClose={() => setIsCropAssignmentModalOpen(false)} 
                    currentUser={currentUser} 
                    setNotification={setNotification} 
                />
            )}
        </div>
    );
};

export default FarmerDetailsPage;
