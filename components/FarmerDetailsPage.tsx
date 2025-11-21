
import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';
import { 
    FarmerModel, FarmPlotModel, SubsidyPaymentModel, ActivityLogModel, 
    AssistanceApplicationModel, TenantModel, TerritoryModel, CropAssignmentModel, CropModel
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
import HarvestLogger from './HarvestLogger';
import InsigniaCard from './InsigniaCard'; // Import the new component

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

// --- Catalyst Widget Component ---
interface CatalystAction {
    title: string;
    description: string;
    buttonLabel: string;
    action: () => void;
    icon: React.ReactNode;
    type: 'URGENT' | 'OPPORTUNITY' | 'ROUTINE';
}

const CatalystWidget: React.FC<{ farmer: Farmer; plots: FarmPlot[]; actions: Record<string, () => void> }> = ({ farmer, plots, actions }) => {
    
    const recommendedAction: CatalystAction | null = useMemo(() => {
        // Priority 1: KYC (Blocker for subsidies)
        if (!farmer.accountVerified) {
            return {
                title: 'KYC Verification Pending',
                description: 'Bank account is unverified. Subsidies cannot be processed.',
                buttonLabel: 'Verify Now',
                action: actions.openKyc,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
                type: 'URGENT'
            };
        }

        // Priority 2: Registered but no Plots (Data Gap)
        if (farmer.status === FarmerStatus.Registered && plots.length === 0) {
            return {
                title: 'Add Farm Plot',
                description: 'Farmer is registered but has no land details. Add a plot to proceed.',
                buttonLabel: 'Add Plot',
                action: actions.openPlot,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
                type: 'URGENT'
            };
        }

        // Priority 3: Plots exist but not Planted (Execution Gap)
        if (farmer.status === FarmerStatus.Sanctioned && plots.length > 0) {
             return {
                title: 'Verify Plantation',
                description: 'Plots are sanctioned. Check if planting is complete to update status.',
                buttonLabel: 'Schedule Visit',
                action: actions.openVisit,
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                type: 'OPPORTUNITY'
            };
        }

        // Priority 4: Planted > 4 years (Mature - Revenue Opportunity)
        const hasMaturePlot = plots.some(p => {
            if (!p.plantation_date) return false;
            const age = (new Date().getTime() - new Date(p.plantation_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
            return age > 3.5;
        });

        if (hasMaturePlot) {
             return {
                title: 'Harvest Ready',
                description: 'Mature plots detected. Ensure harvest logs are being recorded.',
                buttonLabel: 'Log Harvest',
                action: actions.openHarvest, // This implies navigating to harvest logger or opening modal if available
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>,
                type: 'OPPORTUNITY'
            };
        }
        
        // Default: General Advisory
        return {
            title: 'Routine Check-in',
            description: 'Farmer is in good standing. Review agronomic advisory.',
            buttonLabel: 'Open Advisor',
            action: actions.openAdvisor,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
            type: 'ROUTINE'
        };

    }, [farmer, plots]);

    if (!recommendedAction) return null;

    const bgColors = {
        'URGENT': 'bg-red-50 border-red-200',
        'OPPORTUNITY': 'bg-yellow-50 border-yellow-200',
        'ROUTINE': 'bg-blue-50 border-blue-200',
    };

    const btnColors = {
        'URGENT': 'bg-red-600 hover:bg-red-700',
        'OPPORTUNITY': 'bg-yellow-600 hover:bg-yellow-700',
        'ROUTINE': 'bg-blue-600 hover:bg-blue-700',
    };

    return (
        <div className={`mb-6 rounded-lg border p-4 flex items-start justify-between ${bgColors[recommendedAction.type]} shadow-sm`}>
            <div className="flex gap-4">
                <div className={`p-2 rounded-full bg-white shadow-sm`}>
                    {recommendedAction.icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800">{recommendedAction.title}</h4>
                        {recommendedAction.type === 'URGENT' && <span className="px-2 py-0.5 text-[10px] font-bold bg-red-200 text-red-800 rounded-full">ACTION REQUIRED</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{recommendedAction.description}</p>
                </div>
            </div>
            <button 
                onClick={recommendedAction.action}
                className={`px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 ${btnColors[recommendedAction.type]}`}
            >
                {recommendedAction.buttonLabel}
            </button>
        </div>
    );
};


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
    
    // Harvest Logger State
    const [isHarvestLoggerOpen, setIsHarvestLoggerOpen] = useState(false);
    const [activeCropAssignment, setActiveCropAssignment] = useState<CropAssignmentModel | null>(null);

    // Insignia State
    const [isInsigniaOpen, setIsInsigniaOpen] = useState(false);

    // Data Queries
    const farmerModel = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('id', farmerId)), [database, farmerId]))[0];
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', farmerId), Q.sortBy('created_at', 'desc')), [database, farmerId]));
    const subsidies = useQuery(useMemo(() => database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('farmer_id', farmerId), Q.sortBy('payment_date', 'desc')), [database, farmerId]));
    const activities = useQuery(useMemo(() => database.get<ActivityLogModel>('activity_logs').query(Q.where('farmer_id', farmerId), Q.sortBy('created_at', 'desc')), [database, farmerId]));
    const assistanceApps = useQuery(useMemo(() => database.get<AssistanceApplicationModel>('assistance_applications').query(Q.where('farmer_id', farmerId)), [database, farmerId]));
    
    // Fetch crop assignments for plots
    const plotIds = useMemo(() => plots.map(p => p.id), [plots]);
    const assignments = useQuery(useMemo(() => {
        if(plotIds.length === 0) return database.get<CropAssignmentModel>('crop_assignments').query(Q.where('id', 'null'));
        return database.get<CropAssignmentModel>('crop_assignments').query(Q.where('farm_plot_id', Q.oneOf(plotIds)));
    }, [database, plotIds]));
    
    const crops = useQuery(useMemo(() => database.get<CropModel>('crops').query(), [database])); // Simplified query
    const cropMap = useMemo(() => new Map(crops.map(c => [c.id, c.name])), [crops]);

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
    
    const handleLogHarvest = (assignment: CropAssignmentModel) => {
        setActiveCropAssignment(assignment);
        setIsHarvestLoggerOpen(true);
    };

    // Catalyst Actions
    const catalystActions = {
        openKyc: () => setIsKycModalOpen(true),
        openPlot: () => { setSelectedPlot(null); setIsPlotModalOpen(true); },
        openVisit: () => setIsVisitModalOpen(true),
        openHarvest: () => {
            // Try to find a primary assignment to log harvest for.
            // Simplification: Just open the modal for the first assignment if exists, else show generic harvest logger
            // For now, just alert as placeholder if complex flow needed, but let's just open visit modal as proxy or implement direct harvest if assignment exists.
            // Better: show message
            if (assignments.length > 0) {
                handleLogHarvest(assignments[0]);
            } else {
                 setNotification({ message: 'No active crop assignments found to harvest. Assign crops to plots first.', type: 'info' });
                 setActiveTab('plots');
            }
        },
        openAdvisor: () => { /* Navigate to advisor page handled via routing usually, but here we can use props */ }
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
                                <button onClick={() => setIsInsigniaOpen(true)} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200 hover:bg-indigo-200 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1.323l-9.8 3.518A8.955 8.955 0 0110 2zm1 2.677V18H9V4.677L1 7.549V9a9 9 0 1018 0V7.549l-8-2.872z"/></svg>
                                    VIEW INSIGNIA
                                </button>
                            </h1>
                            <p className="text-sm text-gray-500">HAP ID: {farmer.hap_id || 'Pending Sync'} • {getGeoName('village', farmer)}, {getGeoName('mandal', farmer)}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsVisitModalOpen(true)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-semibold">Request Visit</button>
                        <button onClick={() => setIsConsentModalOpen(true)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-semibold">Data Consent</button>
                    </div>
                </div>

                {/* Hapsara Catalyst Widget */}
                <CatalystWidget farmer={farmer} plots={plainPlots} actions={catalystActions} />

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
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-800">Farm Plots ({plots.length})</h3>
                                        <button onClick={() => { setSelectedPlot(null); setIsPlotModalOpen(true); }} className="text-sm text-green-600 hover:underline font-semibold">+ Add Plot</button>
                                    </div>
                                    {plots.map(plot => {
                                        const plotAssignments = assignments.filter(a => a.farmPlotId === plot.id);
                                        
                                        return (
                                        <div key={plot.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow bg-white">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{plot.name}</h4>
                                                    <p className="text-sm text-gray-500">{plot.acreage} Acres • {plot.soilType || 'Unknown Soil'}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setSelectedPlot(plot); setIsPlotModalOpen(true); }} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Edit Plot</button>
                                                    <button onClick={() => handleDeletePlot(plot)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Delete</button>
                                                </div>
                                            </div>
                                            
                                            {/* Hapsara Agros: Crop Assignments */}
                                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-xs font-bold text-gray-500 uppercase">Active Crops</p>
                                                    <button onClick={() => handleOpenCropAssignment(plot)} className="text-xs text-blue-600 hover:underline font-semibold">+ Assign Crop</button>
                                                </div>
                                                {plotAssignments.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {plotAssignments.map(assignment => (
                                                            <div key={assignment.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-2 h-2 rounded-full ${assignment.isPrimaryCrop ? 'bg-green-500' : 'bg-blue-300'}`}></span>
                                                                    <div>
                                                                         <p className="text-sm font-medium text-gray-800">{cropMap.get(assignment.cropId) || 'Unknown Crop'}</p>
                                                                         <p className="text-xs text-gray-500">{assignment.season} {assignment.year}</p>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => handleLogHarvest(assignment)} className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200 flex items-center gap-1">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                                                    Log Harvest
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No crops assigned to this plot.</p>
                                                )}
                                            </div>
                                        </div>
                                    )})}
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
            
            {isHarvestLoggerOpen && activeCropAssignment && (
                <HarvestLogger 
                    cropAssignment={activeCropAssignment}
                    onClose={() => setIsHarvestLoggerOpen(false)}
                    currentUser={currentUser}
                    setNotification={setNotification}
                />
            )}

            {/* Insignia Modal */}
            {isInsigniaOpen && (
                <InsigniaCard 
                    farmer={farmer}
                    onClose={() => setIsInsigniaOpen(false)}
                />
            )}
        </div>
    );
};

export default FarmerDetailsPage;
