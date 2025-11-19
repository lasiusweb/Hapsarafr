
import React, { useState, useEffect, useMemo, useCallback, lazy, useRef, Suspense } from 'react';
import { Database } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, ResourceDistributionModel, ResourceModel, FarmPlotModel, AssistanceApplicationModel, PlantingRecordModel, HarvestModel, QualityAssessmentModel, WithdrawalAccountModel, TenantModel, TerritoryTransferRequestModel, FarmerDealerConsentModel, TerritoryModel, VisitRequestModel, CropAssignmentModel, CropModel, HarvestLogModel, DataSharingConsentModel, AgronomicInputModel } from '../db';
import { User, Permission, FarmerStatus, SubsidyPayment, Farmer, ActivityType, PaymentStage, FarmPlot, SoilType, PlantationMethod, PlantType, AssistanceApplicationStatus, AssistanceScheme, PlantingRecord, Harvest, QualityAssessment, AppealStatus, OverallGrade, WithdrawalAccount, TerritoryTransferStatus, FarmerDealerConsent, VisitRequestStatus, CropAssignment, HarvestLog } from '../types';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import DistributionForm from './DistributionForm';
import ConfirmationModal from './ConfirmationModal';
import { farmerModelToPlain, getGeoName, farmPlotModelToPlain, plantingRecordModelToPlain, harvestModelToPlain, qualityAssessmentModelToPlain } from '../lib/utils';
import { useDatabase } from '../DatabaseContext';
import { Q } from '@nozbe/watermelondb';
import { useQuery } from '../hooks/useQuery';
import CustomSelect from './CustomSelect';
import { ASSISTANCE_SCHEMES } from '../data/assistanceSchemes';
import RequestVisitModal from './RequestVisitModal';
import VisitDetailsModal from './VisitDetailsModal';
import { Card, CardHeader, CardContent } from './ui/Card';


const RegistrationForm = lazy(() => import('./RegistrationForm'));
const LiveAssistantModal = lazy(() => import('./LiveAssistantModal'));
const ProfitabilitySimulator = lazy(() => import('./ProfitabilitySimulator'));
const PlantingRecordFormModal = lazy(() => import('./PlantingRecordFormModal'));
const HarvestForm = lazy(() => import('./HarvestForm'));
const QualityAssessmentDetailsModal = lazy(() => import('./QualityAssessmentDetailsModal'));
const CoPilotSuggestions = lazy(() => import('./CoPilotSuggestions'));
const KycOnboardingModal = lazy(() => import('./KycOnboardingModal'));
const GranularConsentModal = lazy(() => import('./GranularConsentModal'));
const CropAssignmentModal = lazy(() => import('./CropAssignmentModal'));
const HarvestLogger = lazy(() => import('./HarvestLogger'));
const AgronomicInputModal = lazy(() => import('./components/AgronomicInputModal'));


declare var QRCode: any;


// Extend window type for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const TransferModal: React.FC<{
    farmer: Farmer;
    currentUser: User;
    tenants: TenantModel[];
    onClose: () => void;
    onSave: () => void;
}> = ({ farmer, currentUser, tenants, onClose, onSave }) => {
    const database = useDatabase();
    const [toTenantId, setToTenantId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const tenantOptions = tenants
        .filter(t => t.id !== farmer.tenantId)
        .map(t => ({ value: t.id, label: t.name }));
        
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toTenantId) {
            alert('Please select a tenant to transfer to.');
            return;
        }
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<TerritoryTransferRequestModel>('territory_transfer_requests').create(req => {
                    req.farmerId = farmer.id;
                    req.fromTenantId = farmer.tenantId;
                    req.toTenantId = toTenantId;
                    req.status = TerritoryTransferStatus.Pending;
                    req.requestedById = currentUser.id;
                    req.syncStatusLocal = 'pending';
                });
            });
            onSave();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Initiate Territory Transfer</h2></div>
                <div className="p-8 space-y-4">
                    <p>Transferring <strong>{farmer.fullName}</strong> from their current territory.</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Transfer To Tenant</label>
                        <CustomSelect options={tenantOptions} value={toTenantId} onChange={setToTenantId} placeholder="-- Select New Tenant --" />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Submit Request</button>
                </div>
            </form>
        </div>
    );
};

interface FarmerDetailsPageProps {
    farmerId: string;
    database: Database;
    users: User[];
    currentUser: User;
    onBack: () => void;
    permissions: Set<Permission>;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
    allTenants: TenantModel[];
    allTerritories: TerritoryModel[];
}

const DetailItem: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value || 'N/A'}</dd>
    </div>
);

// --- New Subsidy Eligibility View Components ---

interface SubsidyStatus {
    status: 'Paid' | 'Eligible' | 'Pending' | 'Not Yet Eligible' | 'N/A';
    payment?: SubsidyPaymentModel;
    reason?: string;
}

const SubsidyTimelineCard: React.FC<{
    title: string;
    stages: PaymentStage[];
    eligibilityData: Record<PaymentStage, SubsidyStatus>;
    onRecordPayment: (stage: PaymentStage) => void;
}> = ({ title, stages, eligibilityData, onRecordPayment }) => {
    
    const StatusIndicator: React.FC<{ status: SubsidyStatus['status'] }> = ({ status }) => {
        const styles = {
            'Paid': { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-500' },
            'Eligible': { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-blue-500' },
            'Pending': { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-orange-500' },
            'Not Yet Eligible': { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-gray-400' },
            'N/A': { icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'text-gray-400' }
        };
        const currentStyle = styles[status];
        return (
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${currentStyle.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentStyle.icon} />
             </svg>
        );
    };

    return (
        <div className="bg-gray-50 border rounded-lg p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">{title}</h3>
            <ul className="space-y-4">
                {stages.map((stage, index) => {
                    const data = eligibilityData[stage];
                    if (!data) return null; // Defensive check
                    return (
                        <li key={stage} className="flex gap-4 items-start">
                            <div className="flex flex-col items-center">
                                <StatusIndicator status={data.status} />
                                {index < stages.length - 1 && <div className="w-px h-12 bg-gray-300 mt-2"></div>}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-700">{stage.replace('(Year', ' - Year')}</p>
                                {data.status === 'Paid' && data.payment && (
                                    <div className="text-sm text-green-700">Paid {data.payment.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} on {new Date(data.payment.paymentDate).toLocaleDateString()}</div>
                                )}
                                {data.status === 'Eligible' && <button onClick={() => onRecordPayment(stage)} className="mt-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 font-semibold">Record Payment</button>}
                                {data.status === 'Pending' && <button onClick={() => onRecordPayment(stage)} className="mt-1 px-3 py-1 bg-orange-500 text-white text-xs rounded-md hover:bg-orange-600 font-semibold">Record Payment</button>}
                                {(data.status === 'Not Yet Eligible' || data.status === 'N/A') && (
                                    <p className="text-sm text-gray-500">{data.reason || 'Plantation date not set.'}</p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const SubsidyStatusView: React.FC<{ farmer: Farmer; payments: SubsidyPaymentModel[]; onRecordPayment: (stage: PaymentStage) => void }> = ({ farmer, payments, onRecordPayment }) => {
    
    const eligibilityData = useMemo((): Record<PaymentStage, SubsidyStatus> => {
        const now = new Date();
        const plantationDate = (farmer as any).plantationDate ? new Date((farmer as any).plantationDate) : null;
        
        const getStatus = (stage: PaymentStage, year: number, previousStagePayment?: SubsidyPaymentModel): SubsidyStatus => {
            const paid = payments.find(p => p.paymentStage === stage);
            if (paid) return { status: 'Paid', payment: paid };

            if (!plantationDate) return { status: 'N/A' };
            
            const eligibilityStartDate = new Date(plantationDate);
            eligibilityStartDate.setFullYear(eligibilityStartDate.getFullYear() + (year - 1));

            if (year === 1) {
                return plantationDate > now ? { status: 'Not Yet Eligible', reason: `Plantation is in the future.` } : { status: 'Pending' };
            }
            
            if (!previousStagePayment) {
                return { status: 'Not Yet Eligible', reason: `Previous year's payment is pending.` };
            }
            
            if (now >= eligibilityStartDate) {
                return { status: 'Eligible' };
            }
            
            return { status: 'Not Yet Eligible', reason: `Eligible on ${eligibilityStartDate.toLocaleDateString()}` };
        };

        const getOneTimeStatus = (stage: PaymentStage): SubsidyStatus => {
            const paid = payments.find(p => p.paymentStage === stage);
            if (paid) return { status: 'Paid', payment: paid };
            return { status: 'Pending' }; // One-time payments are considered pending if not paid.
        };

        const maintPayments = {
            y1: payments.find(p => p.paymentStage === PaymentStage.MaintenanceYear1),
            y2: payments.find(p => p.paymentStage === PaymentStage.MaintenanceYear2),
            y3: payments.find(p => p.paymentStage === PaymentStage.MaintenanceYear3),
        };
        const interPayments = {
            y1: payments.find(p => p.paymentStage === PaymentStage.IntercroppingYear1),
            y2: payments.find(p => p.paymentStage === PaymentStage.IntercroppingYear2),
            y3: payments.find(p => p.paymentStage === PaymentStage.IntercroppingYear3),
        };
        
        return {
            [PaymentStage.MaintenanceYear1]: getStatus(PaymentStage.MaintenanceYear1, 1),
            [PaymentStage.MaintenanceYear2]: getStatus(PaymentStage.MaintenanceYear2, 2, maintPayments.y1),
            [PaymentStage.MaintenanceYear3]: getStatus(PaymentStage.MaintenanceYear3, 3, maintPayments.y2),
            [PaymentStage.MaintenanceYear4]: getStatus(PaymentStage.MaintenanceYear4, 4, maintPayments.y3),
            [PaymentStage.IntercroppingYear1]: getStatus(PaymentStage.IntercroppingYear1, 1),
            [PaymentStage.IntercroppingYear2]: getStatus(PaymentStage.IntercroppingYear2, 2, interPayments.y1),
            [PaymentStage.IntercroppingYear3]: getStatus(PaymentStage.IntercroppingYear3, 3, interPayments.y2),
            [PaymentStage.IntercroppingYear4]: getStatus(PaymentStage.IntercroppingYear4, 4, interPayments.y3),
            [PaymentStage.PlantingMaterialDomestic]: getOneTimeStatus(PaymentStage.PlantingMaterialDomestic),
            [PaymentStage.PlantingMaterialImported]: getOneTimeStatus(PaymentStage.PlantingMaterialImported),
            [PaymentStage.BoreWell]: getOneTimeStatus(PaymentStage.BoreWell),
            [PaymentStage.VermiCompost]: getOneTimeStatus(PaymentStage.VermiCompost),
            [PaymentStage.Replanting]: getOneTimeStatus(PaymentStage.Replanting),
            [PaymentStage.Fertilizer]: getOneTimeStatus(PaymentStage.Fertilizer),
            [PaymentStage.Other]: getOneTimeStatus(PaymentStage.Other),
        };
    }, [farmer, payments]);
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SubsidyTimelineCard
                title="Maintenance Subsidy Timeline"
                stages={[PaymentStage.MaintenanceYear1, PaymentStage.MaintenanceYear2, PaymentStage.MaintenanceYear3, PaymentStage.MaintenanceYear4]}
                eligibilityData={eligibilityData}
                onRecordPayment={onRecordPayment}
            />
            <SubsidyTimelineCard
                title="Intercropping Subsidy Timeline"
                stages={[PaymentStage.IntercroppingYear1, PaymentStage.IntercroppingYear2, PaymentStage.IntercroppingYear3, PaymentStage.IntercroppingYear4]}
                eligibilityData={eligibilityData}
                onRecordPayment={onRecordPayment}
            />
            <div className="md:col-span-2">
                <SubsidyTimelineCard
                    title="Other Assistance & Subsidies"
                    stages={[
                        PaymentStage.PlantingMaterialDomestic,
                        PaymentStage.PlantingMaterialImported,
                        PaymentStage.BoreWell,
                        PaymentStage.VermiCompost,
                        PaymentStage.Replanting,
                        PaymentStage.Fertilizer,
                        PaymentStage.Other
                    ]}
                    eligibilityData={eligibilityData}
                    onRecordPayment={onRecordPayment}
                />
            </div>
        </div>
    );
};

// --- New Assistance Application Component ---

const AssistanceStatusBadge: React.FC<{ status: AssistanceApplicationStatus }> = ({ status }) => {
    const colors: Record<AssistanceApplicationStatus, string> = {
        [AssistanceApplicationStatus.NotApplied]: 'bg-gray-100 text-gray-600',
        [AssistanceApplicationStatus.Applied]: 'bg-blue-100 text-blue-800',
        [AssistanceApplicationStatus.Approved]: 'bg-green-100 text-green-800',
        [AssistanceApplicationStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

const AssistanceTabContent = withObservables(
    ['farmer'],
    ({ farmer }: { farmer: FarmerModel }) => ({
        assistanceApplications: farmer.assistanceApplications.observe(),
    })
)(({ assistanceApplications, farmer, currentUser, setNotification }: { assistanceApplications: AssistanceApplicationModel[], farmer: FarmerModel, currentUser: User, setNotification: (n: any) => void }) => {
    const database = useDatabase();
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applicationsMap = useMemo(() => new Map(assistanceApplications.map(app => [app.schemeId, app])), [assistanceApplications]);

    const handleStatusChange = async (scheme: AssistanceScheme, newStatus: AssistanceApplicationStatus) => {
        const existingApp = applicationsMap.get(scheme.id);
        setOpenMenu(null);

        if (window.confirm(`Are you sure you want to change the status for "${scheme.title}" to "${newStatus}"?`)) {
            try {
                await database.write(async () => {
                    if (existingApp) {
                        await existingApp.update(app => {
                            app.status = newStatus;
                        });
                    } else {
                        await database.get<AssistanceApplicationModel>('assistance_applications').create(app => {
                            app.farmerId = (farmer as any).id;
                            app.schemeId = scheme.id;
                            app.status = newStatus;
                            app.syncStatusLocal = 'pending';
                            app.tenantId = farmer.tenantId;
                        });
                    }
                    await database.get<ActivityLogModel>('activity_logs').create(log => {
                        log.farmerId = (farmer as any).id;
                        log.activityType = ActivityType.ASSISTANCE_STATUS_CHANGE;
                        log.description = `Status for "${scheme.title}" changed to ${newStatus}.`;
                        log.createdBy = currentUser.id;
                        log.tenantId = farmer.tenantId;
                    });
                });
                setNotification({ message: 'Status updated successfully.', type: 'success' });
            } catch (e) {
                console.error("Failed to update status", e);
                setNotification({ message: 'Failed to update status.', type: 'error' });
            }
        }
    };
    
    return (
        <div className="space-y-4">
            {ASSISTANCE_SCHEMES.map(scheme => {
                const application = applicationsMap.get(scheme.id);
                const status = application?.status || AssistanceApplicationStatus.NotApplied;
                
                return (
                    <div key={scheme.id} className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{scheme.title}</h4>
                            <p className="text-sm text-gray-600">{scheme.description}</p>
                            <p className="text-xs font-semibold text-green-700 mt-1">{scheme.assistance}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <AssistanceStatusBadge status={status} />
                            <div className="relative">
                                <button onClick={() => setOpenMenu(openMenu === scheme.id ? null : scheme.id)} className="p-2 rounded-full hover:bg-gray-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                </button>
                                {openMenu === scheme.id && (
                                    <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                        <ul className="py-1">
                                            {Object.values(AssistanceApplicationStatus).map(s => {
                                                if (s === status) return null;
                                                return <li key={s}><button onClick={() => handleStatusChange(scheme, s)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark as {s}</button></li>
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// --- NEW Harvest Tab Components ---
interface CombinedHarvestData {
    harvest: Harvest;
    assessment: QualityAssessment | null;
}

const HarvestsTabContent = withObservables(
    ['farmer', 'database'],
    ({ farmer, database }: { farmer: FarmerModel; database: Database }) => ({
        harvests: farmer.harvests.observe(),
        assessments: database.get<QualityAssessmentModel>('quality_assessments').query(Q.on('harvests', Q.where('farmer_id', (farmer as any).id))).observe()
    })
)(({ harvests, assessments, onRecord, onDetails }: { harvests: HarvestModel[], assessments: QualityAssessmentModel[], onRecord: () => void, onDetails: (data: CombinedHarvestData) => void }) => {
    
    const assessmentMap = useMemo(() => new Map(assessments.map(a => [a.harvestId, a])), [assessments]);

    const combinedData: CombinedHarvestData[] = useMemo(() => {
        return harvests.map(harvest => ({
            harvest: harvestModelToPlain(harvest)!,
            assessment: qualityAssessmentModelToPlain(assessmentMap.get((harvest as any).id) || null),
        })).sort((a, b) => new Date(b.harvest.harvestDate).getTime() - new Date(a.harvest.harvestDate).getTime());
    }, [harvests, assessmentMap]);
    
    const AppealStatusBadge: React.FC<{ status: AppealStatus }> = ({ status }) => {
        const colors: Record<AppealStatus, string> = {
            [AppealStatus.None]: 'bg-gray-100 text-gray-600',
            [AppealStatus.Pending]: 'bg-yellow-100 text-yellow-800',
            [AppealStatus.Approved]: 'bg-green-100 text-green-800',
            [AppealStatus.Rejected]: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Harvest & Quality History</h3>
                <button onClick={onRecord} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold">
                    + Record New Harvest
                </button>
            </div>
            {combinedData.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harvest Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Weight (kg)</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Overall Grade</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Appeal Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {combinedData.map(data => (
                            <tr key={data.harvest.id}>
                                <td className="px-4 py-3 text-sm">{new Date(data.harvest.harvestDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm">{data.harvest.netWeight.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm font-semibold">{data.assessment?.overallGrade || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm"><AppealStatusBadge status={data.assessment?.appealStatus || AppealStatus.None} /></td>
                                <td className="px-4 py-3 text-sm">
                                    <button onClick={() => onDetails(data)} disabled={!data.assessment} className="font-semibold text-green-600 hover:underline disabled:text-gray-400 disabled:no-underline">View Details</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <p className="font-semibold text-gray-600">No harvests have been recorded for this farmer.</p>
                </div>
            )}
        </div>
    );
});

const KycTabContent = withObservables(['farmer'], ({ farmer }: { farmer: FarmerModel }) => ({
  accounts: farmer.withdrawalAccounts.observe(),
}))(({ accounts, onOpenModal }: { accounts: WithdrawalAccountModel[], onOpenModal: () => void }) => {
    
    const getKycStatus = () => {
        if (accounts.length === 0) {
            return { text: 'Not Started', color: 'text-gray-500', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
        }
        const isVerified = accounts.some(acc => acc.isVerified);
        if (isVerified) {
            return { text: 'Verified', color: 'text-green-600', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> };
        }
        return { text: 'Pending Verification', color: 'text-yellow-600', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
    };
    
    const kycStatus = getKycStatus();
    
    return (
        <div>
            <div className="bg-gray-50 p-6 rounded-lg border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Farmer KYC & Bank Details</h3>
                    <p className="text-sm text-gray-600 mt-1">Onboard farmers to enable direct subsidy and marketplace payments.</p>
                </div>
                 <button onClick={onOpenModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm w-full md:w-auto">
                    {accounts.length > 0 ? 'Update KYC Details' : 'Start KYC Onboarding'}
                </button>
            </div>

            <div className="mt-6 space-y-4">
                <div className="p-4 border rounded-lg flex justify-between items-center">
                    <span className="font-semibold text-gray-700">KYC Status:</span>
                    <span className={`flex items-center gap-2 font-bold ${kycStatus.color}`}>
                        {kycStatus.icon}
                        {kycStatus.text}
                    </span>
                </div>
                {accounts.map(acc => (
                     <div key={(acc as any).id} className="p-4 border rounded-lg">
                        <p className="font-semibold text-gray-700">Registered Account</p>
                        <p className="text-sm text-gray-600">Type: <span className="font-medium capitalize">{acc.accountType.replace('_', ' ')}</span></p>
                        <p className="text-sm text-gray-600">Details: <span className="font-medium font-mono">{acc.details}</span></p>
                    </div>
                ))}
            </div>
        </div>
    );
});

const ServiceProvidersTab = withObservables(['farmer'], ({ farmer }: { farmer: FarmerModel }) => ({
    consents: farmer.consents.observe(),
}))(({ farmer, consents, allTenants, allTerritories, currentUser, onOpenConsentModal, onRevokeConsent }: { 
    farmer: FarmerModel;
    consents: FarmerDealerConsentModel[];
    allTenants: TenantModel[];
    allTerritories: TerritoryModel[];
    currentUser: User;
    onOpenConsentModal: (tenant: { id: string, name: string }, consentRecord: FarmerDealerConsentModel | null) => void;
    onRevokeConsent: (consentRecord: FarmerDealerConsentModel) => void;
}) => {

    const tenantMap = useMemo(() => new Map(allTenants.map(t => [(t as any).id, t.name])), [allTenants]);

    const activeConsents = useMemo(() => consents.filter(c => c.isActive), [consents]);
    const activeConsentTenantIds = useMemo(() => new Set(activeConsents.map(c => (c as any).tenantId)), [activeConsents]);

    const availableDealers = useMemo(() => {
        const farmerAdminCode = `${farmer.district}-${farmer.mandal}`;
        const serviceAreaTenantIds = new Set(allTerritories.filter(t => (t as any).administrativeCode === farmerAdminCode).map(t => (t as any).tenantId));
        
        return allTenants.filter(t => 
            serviceAreaTenantIds.has((t as any).id) && 
            !activeConsentTenantIds.has((t as any).id) &&
            (t as any).id !== farmer.tenantId
        );
    }, [allTerritories, allTenants, farmer, activeConsentTenantIds]);

    const allConsentedTenants = useMemo(() => {
        const consented = activeConsents.map(c => ({
            id: (c as any).tenantId,
            name: tenantMap.get((c as any).tenantId) || 'Unknown Tenant',
            isOriginal: false,
            consentRecord: c,
        }));

        if (!activeConsentTenantIds.has(farmer.tenantId)) {
            consented.unshift({ id: farmer.tenantId, name: tenantMap.get(farmer.tenantId) || 'Unknown Original', isOriginal: true, consentRecord: null });
        } else {
            const original = consented.find(c => c.id === farmer.tenantId);
            if(original) original.isOriginal = true;
        }
        
        return consented;
    }, [activeConsents, farmer.tenantId, tenantMap, activeConsentTenantIds]);


    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Service Providers</h3>
                <div className="space-y-3">
                    {allConsentedTenants.map(tenant => (
                        <div key={tenant.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                            <div>
                                <p className="font-semibold text-gray-800">{tenant.name}</p>
                                {tenant.isOriginal && <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Original Registrar</span>}
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => onOpenConsentModal({id: tenant.id, name: tenant.name}, tenant.consentRecord)} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 font-semibold">Manage Consent</button>
                                {tenant.consentRecord && <button onClick={() => onRevokeConsent(tenant.consentRecord!)} className="text-sm font-semibold text-red-600 hover:underline">Revoke</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
             <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Dealers in {getGeoName('mandal', farmerModelToPlain(farmer)!)}</h3>
                {availableDealers.length > 0 ? (
                    <div className="space-y-3">
                        {availableDealers.map(tenant => (
                            <div key={(tenant as any).id} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
                                <p className="font-semibold text-gray-700">{tenant.name}</p>
                                <button onClick={() => onOpenConsentModal({id: (tenant as any).id, name: tenant.name}, null)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold">Manage Consent</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No other dealers are currently servicing this area.</p>
                )}
            </div>
        </div>
    );
});

const FieldServiceTab = withObservables(
    ['farmer'],
    ({ farmer }: { farmer: FarmerModel }) => ({
        visitRequests: farmer.visitRequests.observe(Q.sortBy('created_at', Q.desc)),
    })
)(({ visitRequests, onOpenRequestModal, onOpenDetailsModal, users }: { visitRequests: VisitRequestModel[], onOpenRequestModal: () => void, onOpenDetailsModal: (req: VisitRequestModel) => void, users: User[] }) => {
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const StatusBadge: React.FC<{ status: VisitRequestStatus }> = ({ status }) => {
        const colors: Record<VisitRequestStatus, string> = {
            [VisitRequestStatus.Pending]: 'bg-yellow-100 text-yellow-800',
            [VisitRequestStatus.Scheduled]: 'bg-blue-100 text-blue-800',
            [VisitRequestStatus.Completed]: 'bg-green-100 text-green-800',
            [VisitRequestStatus.Cancelled]: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Field Visit History</h3>
                <button onClick={onOpenRequestModal} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold">
                    + Request Visit
                </button>
            </div>
            <div className="space-y-3">
                {visitRequests.map(req => (
                    <div key={(req as any).id} onClick={() => onOpenDetailsModal(req)} className={`p-4 border rounded-lg hover:bg-gray-100 cursor-pointer ${req.status === VisitRequestStatus.Completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-gray-800">{req.reason}</p>
                                <p className="text-sm text-gray-500">
                                    Requested for {new Date(req.preferredDate).toLocaleDateString()}
                                    {req.assigneeId && ` | Assigned to ${userMap.get(req.assigneeId) || 'Unknown'}`}
                                </p>
                            </div>
                            <StatusBadge status={req.status as VisitRequestStatus} />
                        </div>
                    </div>
                ))}
                {visitRequests.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-500">
                        No visit requests found for this farmer.
                    </div>
                )}
            </div>
        </div>
    );
});

// --- New Farm Portfolio Tab ---
const EnrichedCropAssignment = withObservables(
    ['assignment'],
    ({ assignment }: { assignment: CropAssignmentModel }) => ({
        crop: assignment.crop.observe(),
        harvests: assignment.harvestLogs.observe(Q.sortBy('harvest_date', Q.desc)),
    })
)(({ assignment, crop, harvests, onLogHarvest }: { assignment: CropAssignmentModel; crop: CropModel; harvests: HarvestLogModel[]; onLogHarvest: (assignment: CropAssignmentModel) => void }) => {
    if (!crop) return null; // Crop might still be loading
    return (
        <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h5 className="font-bold text-gray-800">{crop.name}</h5>
                    <p className="text-xs font-semibold text-gray-500">{assignment.season} {assignment.year}</p>
                </div>
                <button
                    onClick={() => onLogHarvest(assignment)}
                    className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-md hover:bg-green-200 transition"
                >
                    + Log Harvest
                </button>
            </div>
            {harvests.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                    <h6 className="text-xs font-bold text-gray-600 mb-1">Logged Harvests:</h6>
                    <ul className="space-y-1 text-xs text-gray-500">
                        {harvests.map(h => (
                            <li key={(h as any).id} className="flex justify-between">
                                <span>{new Date(h.harvestDate).toLocaleDateString()}</

                                span>
                                <span className="font-medium">{h.quantity} {h.unit}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
});

const PlotTimeline = withObservables(
    ['plot'],
    ({ plot }: { plot: FarmPlotModel }) => ({
        assignments: plot.cropAssignments.observe(Q.sortBy('year', Q.desc)),
        agronomicInputs: plot.agronomicInputs.observe(Q.sortBy('input_date', 'desc')),
    })
)(({ plot, assignments, agronomicInputs, onAssignCrop, onLogHarvest, onLogInput }: {
    plot: FarmPlotModel;
    assignments: CropAssignmentModel[];
    agronomicInputs: AgronomicInputModel[];
    onAssignCrop: (plot: FarmPlotModel) => void;
    onLogHarvest: (assignment: CropAssignmentModel) => void;
    onLogInput: (plot: FarmPlotModel) => void;
}) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between !pb-4">
                <div>
                    <h4 className="font-bold text-lg">{plot.name}</h4>
                    <p className="text-sm text-gray-600">{plot.acreage} Acres</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onLogInput(plot)} className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs font-semibold rounded-md hover:bg-gray-300 transition">Log Input</button>
                    <button
                        onClick={() => onAssignCrop(plot)}
                        className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 font-semibold"
                    >
                        Assign Crop
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {assignments.length > 0 ? (
                    <div className="space-y-3">
                        {assignments.map(assignment => (
                            <EnrichedCropAssignment
                                key={(assignment as any).id}
                                assignment={assignment}
                                onLogHarvest={onLogHarvest}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No crops have been assigned to this plot yet.</p>
                )}
                 {agronomicInputs.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <h6 className="text-xs font-bold text-gray-600 mb-2">Recent Inputs:</h6>
                        <ul className="space-y-2 text-xs text-gray-600">
                            {agronomicInputs.slice(0, 3).map(input => (
                                <li key={(input as any).id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <div>
                                        <span className="font-semibold text-gray-800">{input.name}</span> ({input.inputType})
                                    </div>
                                    <div className="text-right">
                                        <p>{new Date(input.inputDate).toLocaleDateString()}</p>
                                        <p className="font-mono">{input.quantity} {input.unit}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

const FarmPortfolioTab = withObservables(
    ['farmer'],
    ({ farmer }: { farmer: FarmerModel }) => ({
        farmPlots: farmer.farmPlots.observe(Q.sortBy('created_at', 'asc')),
    })
)(({ farmPlots, farmer, currentUser, setNotification }: { farmPlots: FarmPlotModel[], farmer: FarmerModel, currentUser: User, setNotification: (n: any) => void }) => {

    const database = useDatabase();
    const [plotToAssign, setPlotToAssign] = useState<FarmPlotModel | null>(null);
    const [assignmentToLog, setAssignmentToLog] = useState<CropAssignmentModel | null>(null);
    const [plotForInput, setPlotForInput] = useState<FarmPlotModel | null>(null);

    const handleAddPlot = async () => {
        const acreageStr = prompt("Enter acreage for the new plot:");
        const acreage = parseFloat(acreageStr || '0');
        if (acreage > 0) {
            await database.write(async () => {
                const newPlot = await database.get<FarmPlotModel>('farm_plots').create(p => {
                    p.farmerId = (farmer as any).id;
                    p.acreage = acreage;
                    p.name = `Plot ${farmPlots.length + 1}`;
                    p.tenantId = currentUser.tenantId; // Set tenantId
                    p.syncStatusLocal = 'pending';
                });
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = (farmer as any).id;
                    log.activityType = ActivityType.FARM_PLOT_CREATED;
                    log.description = `Created a new plot '${newPlot.name}' of ${acreage} acres.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
        }
    };

    const handleLogInput = async (data: any) => {
        if (!plotForInput) return;
        try {
            await database.write(async () => {
                await database.get<AgronomicInputModel>('agronomic_inputs').create(input => {
                    input.farmPlotId = (plotForInput as any).id;
                    Object.assign(input, data);
                    input.createdBy = currentUser.id;
                    input.tenantId = currentUser.tenantId;
                    input.syncStatusLocal = 'pending';
                });

                const farmPlot = await database.get<FarmPlotModel>('farm_plots').find((plotForInput as any).id);
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmPlot.farmerId;
                    log.activityType = ActivityType.AGRONOMIC_INPUT_LOGGED;
                    log.description = `Logged ${data.quantity} ${data.unit} of ${data.name} for ${farmPlot.name}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Agronomic input logged successfully.', type: 'success' });
            setPlotForInput(null);
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to log input.', type: 'error' });
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Farm Plots & Crop History</h3>
                <button onClick={handleAddPlot} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold">
                    + Add New Farm Plot
                </button>
            </div>
            {farmPlots.length > 0 ? (
                 <div className="space-y-6">
                    {farmPlots.map(plot => (
                        <PlotTimeline
                            key={(plot as any).id}
                            plot={plot}
                            onAssignCrop={setPlotToAssign}
                            onLogHarvest={setAssignmentToLog}
                            onLogInput={setPlotForInput}
                        />
                    ))}
                 </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg bg-gray-50">
                    <p className="font-semibold text-gray-600">No farm plots registered.</p>
                    <p className="text-sm text-gray-500 mt-2">Click "Add New Farm Plot" to get started.</p>
                </div>
            )}
            
            {plotToAssign && (
                <Suspense fallback={null}>
                    <CropAssignmentModal 
                        farmPlot={plotToAssign} 
                        onClose={() => setPlotToAssign(null)} 
                        currentUser={currentUser}
                        setNotification={setNotification}
                    />
                </Suspense>
            )}

            {assignmentToLog && (
                <Suspense fallback={null}>
                    <HarvestLogger 
                        cropAssignment={assignmentToLog}
                        onClose={() => setAssignmentToLog(null)}
                        currentUser={currentUser}
                        setNotification={setNotification}
                    />
                </Suspense>
            )}

            {plotForInput && (
                <Suspense fallback={null}>
                    <AgronomicInputModal 
                        onClose={() => setPlotForInput(null)} 
                        onSubmit={handleLogInput}
                    />
                </Suspense>
            )}
        </div>
    );
});


const InnerFarmerDetailsPage: React.FC<{ farmer: FarmerModel; subsidyPayments: SubsidyPaymentModel[], activityLogs: ActivityLogModel[], resourceDistributions: ResourceDistributionModel[] } & Omit<FarmerDetailsPageProps, 'farmerId' | 'database'>> = ({
    farmer,
    subsidyPayments,
    activityLogs,
    resourceDistributions,
    users,
    currentUser,
    onBack,
    permissions,
    setNotification,
    allTenants,
    allTerritories,
}) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState('details');
    const [isEditing, setIsEditing] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showDistributionForm, setShowDistributionForm] = useState(false);
    const [editingPayment, setEditingPayment] = useState<SubsidyPaymentModel | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<SubsidyPaymentModel | null>(null);
    const [initialPaymentStage, setInitialPaymentStage] = useState<PaymentStage | undefined>(undefined);
    const [showLiveAssistant, setShowLiveAssistant] = useState(false);
    const [showProfitSimulator, setShowProfitSimulator] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showRequestVisitModal, setShowRequestVisitModal] = useState(false);
    const [visitDetailsModal, setVisitDetailsModal] = useState<VisitRequestModel | null>(null);
    
    // New states for multi-crop and value chain
    const [plantingRecordModal, setPlantingRecordModal] = useState<{ isOpen: boolean, plotId?: string, record?: PlantingRecord | null }>({ isOpen: false });
    const [showHarvestForm, setShowHarvestForm] = useState(false);
    const [assessmentDetails, setAssessmentDetails] = useState<CombinedHarvestData | null>(null);
    const [showKycModal, setShowKycModal] = useState(false);
    const [consentModal, setConsentModal] = useState<{isOpen: boolean, tenant?: { id: string, name: string }, consentRecord?: FarmerDealerConsentModel | null}>({isOpen: false});
    
    // Voice note state
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const plainFarmer = useMemo(() => farmerModelToPlain(farmer)!, [farmer]);
    
    const qrCodeRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (qrCodeRef.current && plainFarmer.hap_id) {
            QRCode.toCanvas(qrCodeRef.current, plainFarmer.hap_id, { width: 64 }, (error: any) => {
                if (error) console.error(error);
            });
        }
    }, [plainFarmer.hap_id]);
    
    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg ${activeTab === tabName ? 'bg-white border-b-0 border' : 'bg-gray-100 text-gray-600 border'}`}
        >
            {label}
        </button>
    );

    const handleEdit = () => setIsEditing(true);

    const handleUpdateFarmer = async (updatedFarmerData: Farmer, photoFile?: File) => {
        let photoBase64 = updatedFarmerData.photo;
        if (photoFile) {
            photoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photoFile);
            });
        }

        await database.write(async () => {
            await farmer.update(f => {
                const { id, createdAt, updatedAt, ...rest } = updatedFarmerData;
                Object.assign(f, rest);
                if (photoFile) f.photo = photoBase64;
                f.syncStatusLocal = 'pending';
            });
        });
        setIsEditing(false);
    };

    const handleSavePayment = async (paymentData: Omit<SubsidyPayment, 'syncStatus' | 'createdAt' | 'createdBy' | 'farmerId' | 'tenantId'>) => {
        await database.write(async () => {
            if (editingPayment) { // Update existing payment
                await editingPayment.update(p => {
                    p.paymentDate = paymentData.paymentDate;
                    p.amount = paymentData.amount;
                    p.utrNumber = paymentData.utrNumber;
                    p.paymentStage = paymentData.paymentStage;
                    p.notes = paymentData.notes;
                    p.syncStatusLocal = 'pending';
                });
            } else { // Create new payment
                await database.get<SubsidyPaymentModel>('subsidy_payments').create(p => {
                    p.farmerId = (farmer as any).id;
                    p.paymentDate = paymentData.paymentDate;
                    p.amount = paymentData.amount;
                    p.utrNumber = paymentData.utrNumber;
                    p.paymentStage = paymentData.paymentStage;
                    p.notes = paymentData.notes;
                    p.createdBy = currentUser.id;
                    p.tenantId = farmer.tenantId;
                    p.syncStatusLocal = 'pending';
                });

                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = (farmer as any).id;
                    log.activityType = ActivityType.PAYMENT_RECORDED;
                    log.description = `${paymentData.paymentStage} of ₹${paymentData.amount.toLocaleString()} recorded.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            }
        });
        setShowPaymentForm(false);
        setEditingPayment(null);
    };
    
    const handleDeletePayment = async () => {
        if (paymentToDelete) {
            await database.write(async () => {
                await paymentToDelete.destroyPermanently();
            });
            setPaymentToDelete(null);
        }
    };

    const handleRecordPaymentClick = (stage?: PaymentStage) => {
        setInitialPaymentStage(stage);
        setShowPaymentForm(true);
    };
    
    const handleSaveConsent = useCallback(async (consentData: any) => {
        const { tenant, consentRecord } = consentModal;
        if (!tenant) return;

        try {
            await database.write(async () => {
                if (consentRecord) {
                    await (consentRecord as any).update((c: FarmerDealerConsentModel) => {
                        c.isActive = true;
                        c.permissionsJson = JSON.stringify(consentData);
                        c.grantedBy = 'OFFICER';
                        c.syncStatus = 'pending';
                    });
                } else {
                    await database.get<FarmerDealerConsentModel>('farmer_dealer_consents').create(c => {
                        c.farmerId = (farmer as any).id;
                        c.tenantId = tenant.id;
                        c.isActive = true;
                        c.permissionsJson = JSON.stringify(consentData);
                        c.grantedBy = 'OFFICER';
                        c.syncStatus = 'pending';
                    });
                }
                
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = (farmer as any).id;
                    log.activityType = ActivityType.DATA_CONSENT_UPDATED;
                    log.description = `Data sharing consent updated for ${tenant.name}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            });
            setNotification({ message: 'Consent updated.', type: 'success'});
            setConsentModal({isOpen: false});
        } catch(e) {
            setNotification({ message: 'Failed to update consent.', type: 'error'});
        }

    }, [consentModal, database, farmer, currentUser, setNotification]);

    const handleRevokeConsent = useCallback(async (consentRecord: FarmerDealerConsentModel) => {
        const partnerTenant = allTenants.find(t => (t as any).id === consentRecord.tenantId);
        if(window.confirm(`Are you sure you want to revoke data sharing consent for ${partnerTenant?.name || 'this partner'}?`)) {
            try {
                await database.write(async () => {
                    await (consentRecord as any).update((c: FarmerDealerConsentModel) => {
                        c.isActive = false;
                        c.syncStatus = 'pending';
                    });
                    await database.get<ActivityLogModel>('activity_logs').create(log => {
                        log.farmerId = (farmer as any).id;
                        log.activityType = ActivityType.DEALER_CONSENT_REVOKED;
                        log.description = `Data sharing consent revoked for ${partnerTenant?.name || 'partner'}.`;
                        log.createdBy = currentUser.id;
                        log.tenantId = farmer.tenantId;
                    });
                });
                setNotification({ message: 'Consent revoked.', type: 'success'});
            } catch(e) {
                 setNotification({ message: 'Failed to revoke consent.', type: 'error'});
            }
        }
    }, [database, setNotification, farmer, currentUser, allTenants]);


    if (isEditing) {
        return <Suspense fallback={<div className="p-6">Loading form...</div>}>
            <RegistrationForm
                mode="edit"
                existingFarmer={plainFarmer}
                onSubmit={handleUpdateFarmer}
                onCancel={() => setIsEditing(false)}
                existingFarmers={[]} // Not needed for edit mode's duplicate check
                setNotification={setNotification}
                currentUser={currentUser}
            />
        </Suspense>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                    &larr; Back to Directory
                </button>

                 <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                             {plainFarmer.photo ? (
                                <img src={plainFarmer.photo} alt={plainFarmer.fullName} className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-md" />
                            ) : (
                                <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-4xl shadow-md">
                                    {plainFarmer.fullName.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-800">{plainFarmer.fullName}</h1>
                                    <p className="text-gray-500 font-mono">{plainFarmer.hap_id || 'Pending Sync'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     {permissions.has(Permission.CAN_EDIT_FARMER) && <button onClick={handleEdit} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold text-sm">Edit</button>}
                                     <button onClick={() => setShowLiveAssistant(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">CoPilot</button>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><dt className="text-gray-500">Mobile</dt><dd className="font-semibold text-gray-800">{plainFarmer.mobileNumber}</dd></div>
                                <div><dt className="text-gray-500">Location</dt><dd className="font-semibold text-gray-800">{getGeoName('village', plainFarmer)}</dd></div>
                                <div><dt className="text-gray-500">Area</dt><dd className="font-semibold text-gray-800">{plainFarmer.approvedExtent || 0} Ac</dd></div>
                                <div><dt className="text-gray-500">Status</dt><dd className="font-semibold text-gray-800">{plainFarmer.status}</dd></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6 flex space-x-2 border-b">
                    <TabButton tabName="details" label="Farmer Details" />
                    <TabButton tabName="portfolio" label="Farm Portfolio" />
                    <TabButton tabName="subsidy" label="Subsidy & Payments" />
                    <TabButton tabName="assistance" label="Assistance Schemes" />
                    <TabButton tabName="harvests" label="Harvest & Quality" />
                    <TabButton tabName="services" label="Field Service" />
                    <TabButton tabName="kyc" label="KYC & Wallet" />
                    <TabButton tabName="consents" label="Service Providers" />
                    <TabButton tabName="activity" label="Activity Log" />
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8">
                    {activeTab === 'details' && (
                        <div>Details Tab Content...</div>
                    )}
                     {activeTab === 'portfolio' && <FarmPortfolioTab farmer={farmer} currentUser={currentUser} setNotification={setNotification} />}
                     {activeTab === 'subsidy' && (
                        <SubsidyStatusView farmer={plainFarmer} payments={subsidyPayments} onRecordPayment={handleRecordPaymentClick} />
                    )}
                     {activeTab === 'assistance' && <AssistanceTabContent farmer={farmer} currentUser={currentUser} setNotification={setNotification} />}
                     {activeTab === 'harvests' && <HarvestsTabContent farmer={farmer} database={database} onRecord={() => setShowHarvestForm(true)} onDetails={(data) => setAssessmentDetails(data)} />}
                     {activeTab === 'services' && <FieldServiceTab farmer={farmer} onOpenRequestModal={() => setShowRequestVisitModal(true)} onOpenDetailsModal={setVisitDetailsModal} users={users} />}
                     {activeTab === 'kyc' && <KycTabContent farmer={farmer} onOpenModal={() => setShowKycModal(true)} />}
                     {activeTab === 'consents' && <ServiceProvidersTab farmer={farmer} allTenants={allTenants} allTerritories={allTerritories} currentUser={currentUser} onOpenConsentModal={(tenant, consentRecord) => setConsentModal({isOpen: true, tenant, consentRecord})} onRevokeConsent={handleRevokeConsent} />}
                     {activeTab === 'activity' && <p>Activity Log tab coming soon.</p>}
                </div>
            </div>
            
            {showPaymentForm && <SubsidyPaymentForm onClose={() => { setShowPaymentForm(false); setEditingPayment(null); }} onSubmit={handleSavePayment} existingPayment={editingPayment} initialStage={initialPaymentStage} />}
            {paymentToDelete && <ConfirmationModal isOpen={!!paymentToDelete} title="Delete Payment?" message="Are you sure you want to delete this payment record? This action cannot be undone." onConfirm={handleDeletePayment} onCancel={() => setPaymentToDelete(null)} confirmText="Delete" confirmButtonVariant="destructive" />}
            {showLiveAssistant && <Suspense fallback={null}><LiveAssistantModal farmer={plainFarmer} onClose={() => setShowLiveAssistant(false)} onExecuteAction={(action) => { if(action === 'SHOW_PROFIT_SIMULATOR') { setShowLiveAssistant(false); setShowProfitSimulator(true); } }} /></Suspense>}
            {showKycModal && <Suspense fallback={null}><KycOnboardingModal farmer={plainFarmer} onClose={() => setShowKycModal(false)} setNotification={setNotification} /></Suspense>}
            {consentModal.isOpen && <Suspense fallback={null}><GranularConsentModal isOpen={consentModal.isOpen} onClose={() => setConsentModal({isOpen: false})} onSave={handleSaveConsent} farmer={plainFarmer} tenant={consentModal.tenant!} existingConsent={consentModal.consentRecord ? JSON.parse(consentModal.consentRecord.permissionsJson || '{}') : {}} /></Suspense>}

        </div>
    );
};

const enhance = withObservables(
    ['farmerId'],
    ({ farmerId, database }: { farmerId: string, database: Database }) => ({
        farmer: database.get<FarmerModel>('farmers').findAndObserve(farmerId),
        subsidyPayments: database.get<SubsidyPaymentModel>('subsidy_payments').query(Q.where('farmer_id', farmerId), Q.sortBy('payment_date', 'desc')).observe(),
        activityLogs: database.get<ActivityLogModel>('activity_logs').query(Q.where('farmer_id', farmerId), Q.sortBy('created_at', 'desc')).observe(),
        resourceDistributions: database.get<ResourceDistributionModel>('resource_distributions').query(Q.where('farmer_id', farmerId), Q.sortBy('distribution_date', 'desc')).observe(),
    })
);

const EnhancedFarmerDetailsPage = enhance(InnerFarmerDetailsPage);

const FarmerDetailsPage: React.FC<Omit<FarmerDetailsPageProps, 'database'>> = (props) => {
    const database = useDatabase();
    // This is a simple way to handle the case where the farmer might not exist.
    // A more robust solution might use a router that handles 404s.
    const farmerExists = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('id', props.farmerId)), [database, props.farmerId]));
    
    if(farmerExists.length === 0) {
        return (
            <div className="p-6 text-center">
                <h1 className="text-2xl font-bold">Farmer not found</h1>
                <p>The requested farmer could not be found in the local database.</p>
                <button onClick={props.onBack} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md">Go Back</button>
            </div>
        )
    }

    return <EnhancedFarmerDetailsPage {...props} database={database} />;
};

export default FarmerDetailsPage;
