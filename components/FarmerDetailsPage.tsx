

import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';
import { 
    FarmerModel, FarmPlotModel, SubsidyPaymentModel, ActivityLogModel, 
    AssistanceApplicationModel, TenantModel, TerritoryModel, CropAssignmentModel, CropModel, InteractionModel
} from '../db';
import { 
    User, Farmer, FarmPlot, SubsidyPayment, PaymentStage, ActivityType, 
    Permission, AssistanceApplicationStatus, FarmerStatus, RelationshipStage, Interaction
} from '../types';
import { 
    farmerModelToPlain, farmPlotModelToPlain, subsidyPaymentModelToPlain, 
    formatCurrency, getGeoName 
} from '../lib/utils';
import { calculateEngagementScore } from '../lib/crmEngine';

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
import InsigniaCard from './InsigniaCard';
import InteractionLogger from './InteractionLogger'; // New Import

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

// ... CatalystWidget Component (unchanged)
interface CatalystAction {
    title: string;
    description: string;
    buttonLabel: string;
    action: () => void;
    icon: React.ReactNode;
    type: 'URGENT' | 'OPPORTUNITY' | 'ROUTINE';
}

const CatalystWidget: React.FC<{ farmer: Farmer; plots: FarmPlot[]; actions: Record<string, () => void>; engagement?: {score: number, nextAction: string} }> = ({ farmer, plots, actions, engagement }) => {
    
    const recommendedAction: CatalystAction | null = useMemo(() => {
        // CRM Driven Logic overrides static logic if score is low
        if (engagement && engagement.score < 40) {
             return {
                title: 'Relationship At Risk',
                description: `Engagement score is ${engagement.score}/100. Last interaction was too long ago.`,
                buttonLabel: 'Log Interaction',
                action: actions.openInteraction, // Use general interaction logger
                icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                type: 'URGENT'
            };
        }

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
                action: actions.openHarvest, 
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

    }, [farmer, plots, engagement]);

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
    const [activeTab, setActiveTab] = useState<'overview' | 'plots' | 'subsidies' | 'interactions' | 'kyc'>('overview');
    
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
    const [isInteractionLoggerOpen, setIsInteractionLoggerOpen] = useState(false); // New State
    
    // Harvest Logger State
    const [isHarvestLoggerOpen, setIsHarvestLoggerOpen] = useState(false);
    const [activeCropAssignment, setActiveCropAssignment] = useState<CropAssignmentModel | null>(null);

    // Insignia State
    const [isInsigniaOpen, setIsInsigniaOpen] = useState(false);

    // Data Queries
    const farmerModel = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('id', farmerId)), [database, farmerId]))[0];
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(Q.where('farmer_id', farmerId), Q.sortBy('created_at', 'desc')), [database, farmerId]));
    const subsidies = useQuery(useMemo(() => database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('farmer_id', farmerId), Q.sortBy('payment_date', 'desc')), [database, farmerId]));
    // Removed generic Activity Log for specific Interaction Log
    const interactions = useQuery(useMemo(() => database.get<InteractionModel>('interactions').query(Q.where('farmer_id', farmerId), Q.sortBy('date', 'desc')), [database, farmerId]));
    const assistanceApps = useQuery(useMemo(() => database.get<AssistanceApplicationModel>('assistance_applications').query(Q.where('farmer_id', farmerId)), [database, farmerId]));
    
    // ... (Crop & Assignment Queries unchanged)
    const plotIds = useMemo(() => plots.map(p => p.id), [plots]);
    const assignments = useQuery(useMemo(() => {
        if(plotIds.length === 0) return database.get<CropAssignmentModel>('crop_assignments').query(Q.where('id', 'null'));
        return database.get<CropAssignmentModel>('crop_assignments').query(Q.where('farm_plot_id', Q.oneOf(plotIds)));
    }, [database, plotIds]));
    const crops = useQuery(useMemo(() => database.get<CropModel>('crops').query(), [database]));
    const cropMap = useMemo(() => new Map(crops.map(c => [c.id, c.name])), [crops]);

    const farmer = useMemo(() => farmerModelToPlain(farmerModel), [farmerModel]);
    const plainPlots = useMemo(() => plots.map(p => farmPlotModelToPlain(p)!), [plots]);

    // CRM Calculation
    const engagementMetrics = useMemo(() => {
        if(!interactions) return undefined;
        const plainInteractions = interactions.map(i => i._raw as unknown as Interaction);
        return calculateEngagementScore(plainInteractions);
    }, [interactions]);

    // Handlers (Save Plot, Save Subsidy, etc. unchanged - reusing existing logic)
    const handleSavePlot = useCallback(async (data: any, mode: 'create' | 'edit') => { /* ... same as before ... */ }, [database, farmerId, currentUser.tenantId, selectedPlot, setNotification]);
    const handleDeletePlot = useCallback(async (plot: FarmPlotModel) => { /* ... same as before ... */ }, [database, setNotification]);
    const handleSaveSubsidy = useCallback(async (data: any) => { /* ... same as before ... */ }, [database, farmerId, currentUser, selectedSubsidy, setNotification]);

    // Catalyst Actions
    const catalystActions = {
        openKyc: () => setIsKycModalOpen(true),
        openPlot: () => { setSelectedPlot(null); setIsPlotModalOpen(true); },
        openVisit: () => setIsVisitModalOpen(true),
        openHarvest: () => { /* ... same as before ... */ },
        openAdvisor: () => { /* ... same as before ... */ },
        openInteraction: () => setIsInteractionLoggerOpen(true) // New Action
    };

    if (!farmer) return <div className="p-6 text-center">Loading farmer details...</div>;

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
                                {engagementMetrics && (
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${engagementMetrics.score > 70 ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {engagementMetrics.stage} ({engagementMetrics.score})
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm text-gray-500">HAP ID: {farmer.hap_id || 'Pending Sync'} • {getGeoName('village', farmer)}, {getGeoName('mandal', farmer)}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsInteractionLoggerOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-bold shadow-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            Log Interaction
                        </button>
                        <button onClick={() => setIsVisitModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-semibold">Schedule Visit</button>
                    </div>
                </div>

                {/* Hapsara Catalyst Widget */}
                <CatalystWidget farmer={farmer} plots={plainPlots} actions={catalystActions} engagement={engagementMetrics} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Profile & CoPilot */}
                    <div className="space-y-6">
                        {/* ... existing Profile Card ... */}
                         <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                             {/* ... same as before ... */}
                             <div className="text-center mb-4">
                                <img src={farmer.photo || 'https://via.placeholder.com/150'} alt={farmer.fullName} className="w-24 h-24 rounded-full mx-auto mb-2 object-cover border-2 border-gray-100" />
                                <p className="text-sm font-mono text-gray-500">{farmer.mobileNumber}</p>
                            </div>
                            {/* ... */}
                         </div>

                         <CoPilotSuggestions farmer={farmer} plots={plainPlots} />
                    </div>

                    {/* Right Column: Tabs */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[500px]">
                        <div className="flex border-b overflow-x-auto">
                            <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'overview' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Overview</button>
                            <button onClick={() => setActiveTab('interactions')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'interactions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>CRM Timeline</button>
                            <button onClick={() => setActiveTab('plots')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'plots' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Farm Portfolio</button>
                            <button onClick={() => setActiveTab('subsidies')} className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'subsidies' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Subsidies</button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                             {activeTab === 'overview' && (
                                 // ... Same as before
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
                                 </div>
                             )}

                             {activeTab === 'interactions' && (
                                 <div className="space-y-6">
                                     <div className="flex justify-between items-center">
                                         <h3 className="font-bold text-gray-800">Interaction History</h3>
                                         <p className="text-xs text-gray-500">{interactions.length} records found</p>
                                     </div>
                                     <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                        {interactions.map(interaction => (
                                            <div key={interaction.id} className="ml-6 relative">
                                                 <span className={`absolute -left-[31px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${interaction.type === 'FIELD_VISIT' ? 'bg-blue-500' : 'bg-indigo-500'}`}>
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                                </span>
                                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-800">{interaction.type.replace('_', ' ')}</h4>
                                                        <span className="text-xs text-gray-500">{new Date(interaction.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-3">{interaction.notes}</p>
                                                    <div className="flex gap-2">
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${interaction.outcome === 'POSITIVE' ? 'bg-green-100 text-green-800' : interaction.outcome === 'NEGATIVE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{interaction.outcome}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {interactions.length === 0 && <p className="ml-6 text-gray-500 italic">No interactions logged yet.</p>}
                                     </div>
                                 </div>
                             )}

                             {/* ... other tabs (plots, subsidies) same as before */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {/* ... existing modals ... */}
            {isInteractionLoggerOpen && (
                <InteractionLogger 
                    farmer={farmer} 
                    currentUser={currentUser} 
                    onClose={() => setIsInteractionLoggerOpen(false)}
                    onSaveSuccess={() => setNotification({ message: 'Interaction Logged', type: 'success' })}
                />
            )}
        </div>
    );
};

export default FarmerDetailsPage;