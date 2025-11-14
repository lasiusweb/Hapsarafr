import React, { useState, useEffect, useMemo, useCallback, lazy, useRef } from 'react';
import { Database } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, ResourceDistributionModel, ResourceModel, PlotModel, AssistanceApplicationModel, PlantingRecordModel, HarvestModel, QualityAssessmentModel, WithdrawalAccountModel, TenantModel, TerritoryTransferRequestModel, FarmerDealerConsentModel, TerritoryModel } from '../db';
import { User, Permission, FarmerStatus, SubsidyPayment, Farmer, ActivityType, PaymentStage, Plot, SoilType, PlantationMethod, PlantType, AssistanceApplicationStatus, AssistanceScheme, PlantingRecord, Harvest, QualityAssessment, AppealStatus, OverallGrade, WithdrawalAccount, TerritoryTransferStatus, FarmerDealerConsent } from '../types';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import DistributionForm from './DistributionForm';
import ConfirmationModal from './ConfirmationModal';
import { farmerModelToPlain, getGeoName, plotModelToPlain, plantingRecordModelToPlain, harvestModelToPlain, qualityAssessmentModelToPlain } from '../lib/utils';
import { useDatabase } from '../DatabaseContext';
import { Q } from '@nozbe/watermelondb';
import { useQuery } from '../hooks/useQuery';
import CustomSelect from './CustomSelect';
import { ASSISTANCE_SCHEMES } from '../data/assistanceSchemes';

const RegistrationForm = lazy(() => import('./RegistrationForm'));
const LiveAssistantModal = lazy(() => import('./LiveAssistantModal'));
const ProfitabilitySimulator = lazy(() => import('./ProfitabilitySimulator'));
const PlantingRecordFormModal = lazy(() => import('./PlantingRecordFormModal'));
const HarvestForm = lazy(() => import('./HarvestForm'));
const QualityAssessmentDetailsModal = lazy(() => import('./QualityAssessmentDetailsModal'));
const CoPilotSuggestions = lazy(() => import('./CoPilotSuggestions'));
const KycOnboardingModal = lazy(() => import('./KycOnboardingModal'));


declare var QRCode: any;


// Extend window type for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const PlotFormModal: React.FC<{
    onClose: () => void;
    onSubmit: (data: Partial<Plot>) => Promise<void>;
    plot?: Plot | null;
    farmerId: string;
}> = ({ onClose, onSubmit, plot, farmerId }) => {
    const isEditMode = !!plot;
    const [formData, setFormData] = useState({
        acreage: plot?.acreage || '',
        soilType: plot?.soilType || SoilType.Loamy,
        plantationDate: plot?.plantationDate?.split('T')[0] || '',
        numberOfPlants: plot?.numberOfPlants || '',
        methodOfPlantation: plot?.methodOfPlantation || PlantationMethod.Square,
        plantType: plot?.plantType || PlantType.Imported,
        mlrdPlants: plot?.mlrdPlants || '',
        fullCostPlants: plot?.fullCostPlants || '',
        geojson: plot?.geojson || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        const acreage = Number(formData.acreage);
        const numberOfPlants = Number(formData.numberOfPlants);
        const mlrdPlants = Number(formData.mlrdPlants) || 0;
        const fullCostPlants = Number(formData.fullCostPlants) || 0;

        if (acreage <= 0) newErrors.acreage = 'Acreage must be a positive number.';
        if (numberOfPlants <= 0) newErrors.numberOfPlants = 'Number of plants must be a positive number.';
        if (mlrdPlants + fullCostPlants > numberOfPlants) {
            newErrors.mlrdPlants = 'Sum of MLRD and Full Cost plants cannot exceed total plants.';
        }
        if (formData.plantationDate && new Date(formData.plantationDate) > new Date()) {
            newErrors.plantationDate = 'Plantation date cannot be in the future.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        setIsSubmitting(true);
        try {
            await onSubmit({
                id: plot?.id,
                farmerId: farmerId,
                acreage: Number(formData.acreage),
                soilType: formData.soilType as SoilType,
                plantationDate: formData.plantationDate || undefined,
                numberOfPlants: Number(formData.numberOfPlants),
                methodOfPlantation: formData.methodOfPlantation as PlantationMethod,
                plantType: formData.plantType as PlantType,
                mlrdPlants: Number(formData.mlrdPlants) || 0,
                fullCostPlants: Number(formData.fullCostPlants) || 0,
                geojson: formData.geojson || undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const soilTypeOptions = Object.values(SoilType).map(s => ({ value: s, label: s }));
    const plantationMethodOptions = Object.values(PlantationMethod).map(s => ({ value: s, label: s }));
    const plantTypeOptions = Object.values(PlantType).map(s => ({ value: s, label: s }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Plot' : 'Add New Plot'}</h2>
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Acreage *</label>
                        <input type="number" step="0.01" name="acreage" value={formData.acreage} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        {errors.acreage && <p className="text-xs text-red-600 mt-1">{errors.acreage}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Number of Plants *</label>
                        <input type="number" name="numberOfPlants" value={formData.numberOfPlants} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        {errors.numberOfPlants && <p className="text-xs text-red-600 mt-1">{errors.numberOfPlants}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Soil Type</label>
                        <CustomSelect value={formData.soilType} onChange={v => setFormData(s => ({ ...s, soilType: v as SoilType }))} options={soilTypeOptions} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plantation Date</label>
                        <input type="date" name="plantationDate" value={formData.plantationDate} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        {errors.plantationDate && <p className="text-xs text-red-600 mt-1">{errors.plantationDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Method of Plantation</label>
                        <CustomSelect value={formData.methodOfPlantation} onChange={v => setFormData(s => ({ ...s, methodOfPlantation: v as PlantationMethod }))} options={plantationMethodOptions} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plant Type</label>
                        <CustomSelect value={formData.plantType} onChange={v => setFormData(s => ({ ...s, plantType: v as PlantType }))} options={plantTypeOptions} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">MLRD Plants</label>
                        <input type="number" name="mlrdPlants" value={formData.mlrdPlants} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        {errors.mlrdPlants && <p className="text-xs text-red-600 mt-1">{errors.mlrdPlants}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Full Cost Plants</label>
                        <input type="number" name="fullCostPlants" value={formData.fullCostPlants} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">GeoJSON (Optional)</label>
                        <textarea name="geojson" value={formData.geojson} onChange={handleChange} rows={4} className="mt-1 w-full p-2 border border-gray-300 rounded-md font-mono text-xs" placeholder='e.g., {"type": "Polygon", "coordinates": [...] }'></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : 'Save Plot'}
                    </button>
                </div>
            </form>
        </div>
    );
};

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={currentStyle.icon} />
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
        const plantationDate = farmer.plantationDate ? new Date(farmer.plantationDate) : null;
        
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

// --- New Land & Plantation Components ---

const PlotCard: React.FC<{ plot: Plot; onEdit: () => void; onDelete: () => void }> = ({ plot, onEdit, onDelete }) => (
    <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                <div>
                    <h4 className="font-bold text-gray-800">{plot.acreage} Acres</h4>
                    <p className="text-xs text-gray-500">ID: ...{plot.id.slice(-6)}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={onEdit} className="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                <button onClick={onDelete} className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetailItem label="No. of Plants" value={plot.numberOfPlants} />
            <DetailItem label="Plantation Date" value={plot.plantationDate ? new Date(plot.plantationDate).toLocaleDateString() : 'N/A'} />
            <DetailItem label="Soil Type" value={plot.soilType} />
            <DetailItem label="Plantation Method" value={plot.methodOfPlantation} />
        </div>
    </div>
);

const PlotsTabContent = withObservables(['farmer'], ({ farmer }: { farmer: FarmerModel }) => ({
  plots: farmer.plots.observe(),
}))(({ plots, onAdd, onEdit, onDelete }: { plots: PlotModel[], onAdd: () => void, onEdit: (plot: Plot) => void, onDelete: (plot: Plot) => void }) => {
    
    if (!plots) {
        return <div className="text-center p-10">Loading plots...</div>;
    }

    const plainPlots = plots.map(p => plotModelToPlain(p) as Plot);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Registered Land Plots</h3>
                <button onClick={onAdd} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold">
                    + Add New Plot
                </button>
            </div>
            {plainPlots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plainPlots.map(plot => (
                        <PlotCard key={plot.id} plot={plot} onEdit={() => onEdit(plot)} onDelete={() => onDelete(plot)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <p className="font-semibold text-gray-600">No plots have been registered for this farmer.</p>
                    <p className="text-sm text-gray-500 mt-2">Click "Add New Plot" to get started.</p>
                </div>
            )}
        </div>
    );
});

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
                            app.farmerId = farmer.id;
                            app.schemeId = scheme.id;
                            app.status = newStatus;
                            app.syncStatusLocal = 'pending';
                            app.tenantId = farmer.tenantId;
                        });
                    }
                    await database.get<ActivityLogModel>('activity_logs').create(log => {
                        log.farmerId = farmer.id;
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

// --- NEW Genetic Traceability Components ---

const PlantingRecordCard: React.FC<{ record: PlantingRecord, onEdit: () => void; onDelete: () => void; }> = ({ record, onEdit, onDelete }) => {
    const qrCodeRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (qrCodeRef.current && record.id) {
            QRCode.toCanvas(qrCodeRef.current, record.id, { width: 100 }, (error: any) => {
                if (error) console.error('QR Code generation failed:', error);
            });
        }
    }, [record.id]);
    
    return (
        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200 flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                    <h5 className="font-bold text-blue-800">{record.geneticVariety}</h5>
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="text-sm font-semibold text-blue-600 hover:underline">Edit</button>
                        <button onClick={onDelete} className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <DetailItem label="Seed Source" value={record.seedSource} />
                    <DetailItem label="No. of Plants" value={record.numberOfPlants} />
                    <DetailItem label="Planting Date" value={new Date(record.plantingDate).toLocaleDateString()} />
                    <DetailItem label="Care Guide" value={record.careInstructionsUrl ? <a href={record.careInstructionsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a> : 'N/A'} />
                </div>
            </div>
             <div className="text-center flex-shrink-0">
                <canvas ref={qrCodeRef}></canvas>
                <p className="text-xs text-gray-500 mt-1 font-mono">ID: ...{record.id.slice(-6)}</p>
            </div>
        </div>
    );
};


const PlotTraceabilityCard = withObservables(
    ['plot'], 
    ({ plot }: { plot: PlotModel }) => ({
        plantingRecords: plot.plantingRecords.observe()
    })
)(({ plot, plantingRecords, onAdd, onEdit, onDelete }: { plot: PlotModel, plantingRecords: PlantingRecordModel[], onAdd: (plotId: string) => void, onEdit: (record: PlantingRecord) => void, onDelete: (record: PlantingRecordModel) => void }) => {
    
    const plainPlot = plotModelToPlain(plot)!;
    const plainRecords = plantingRecords.map(r => plantingRecordModelToPlain(r)!);

    return (
        <div className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center border-b pb-2">
                <div>
                    <h4 className="font-bold text-gray-800">{plainPlot.acreage} Acres</h4>
                    <p className="text-xs text-gray-500">Plot ID: ...{plainPlot.id.slice(-6)}</p>
                </div>
                <button onClick={() => onAdd(plainPlot.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 font-semibold">+ Add Record</button>
            </div>
            
            {plainRecords.length > 0 ? (
                <div className="space-y-3">
                    {plainRecords.map(rec => <PlantingRecordCard key={rec.id} record={rec} onEdit={() => onEdit(rec)} onDelete={() => onDelete(plantingRecords.find(r => r.id === rec.id)!)} />)}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No genetic traceability records for this plot.</p>
                </div>
            )}
        </div>
    );
});


const TraceabilityTabContent = withObservables(
    ['farmer'], 
    ({ farmer }: { farmer: FarmerModel }) => ({
        plots: farmer.plots.observe()
    })
)(({ plots, onAdd, onEdit, onDelete }: { plots: PlotModel[], onAdd: (plotId: string) => void, onEdit: (record: PlantingRecord) => void, onDelete: (record: PlantingRecordModel) => void }) => {
    
    if (!plots) {
        return <div className="text-center p-10">Loading plots...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Genetic Traceability by Plot</h3>
            </div>
            {plots.length > 0 ? (
                <div className="space-y-6">
                    {plots.map(plot => (
                       <PlotTraceabilityCard key={plot.id} plot={plot} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <p className="font-semibold text-gray-600">No plots have been registered for this farmer.</p>
                    <p className="text-sm text-gray-500 mt-2">Add a plot under the "Land & Plantation" tab first.</p>
                </div>
            )}
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
        assessments: database.get<QualityAssessmentModel>('quality_assessments').query(Q.on('harvests', Q.where('farmer_id', farmer.id))).observe()
    })
)(({ harvests, assessments, onRecord, onDetails }: { harvests: HarvestModel[], assessments: QualityAssessmentModel[], onRecord: () => void, onDetails: (data: CombinedHarvestData) => void }) => {
    
    const assessmentMap = useMemo(() => new Map(assessments.map(a => [a.harvestId, a])), [assessments]);

    const combinedData: CombinedHarvestData[] = useMemo(() => {
        return harvests.map(harvest => ({
            harvest: harvestModelToPlain(harvest)!,
            assessment: qualityAssessmentModelToPlain(assessmentMap.get(harvest.id) || null),
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
                     <div key={acc.id} className="p-4 border rounded-lg">
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
}))(({ farmer, consents, allTenants, allTerritories, currentUser, database, setNotification }: { 
    farmer: FarmerModel;
    consents: FarmerDealerConsentModel[];
    allTenants: TenantModel[];
    allTerritories: TerritoryModel[];
    currentUser: User;
    database: Database;
    setNotification: (n: any) => void;
}) => {

    const [consentToRevoke, setConsentToRevoke] = useState<FarmerDealerConsentModel | null>(null);
    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);

    const activeConsents = useMemo(() => consents.filter(c => c.isActive), [consents]);
    const activeConsentTenantIds = useMemo(() => new Set(activeConsents.map(c => c.tenantId)), [activeConsents]);

    const availableDealers = useMemo(() => {
        const farmerAdminCode = `${farmer.district}-${farmer.mandal}`;
        const serviceAreaTenantIds = new Set(allTerritories.filter(t => t.administrativeCode === farmerAdminCode).map(t => t.tenantId));
        
        return allTenants.filter(t => 
            serviceAreaTenantIds.has(t.id) && 
            !activeConsentTenantIds.has(t.id) &&
            t.id !== farmer.tenantId // Also exclude original tenant if not in consents for some reason
        );
    }, [allTerritories, allTenants, farmer, activeConsentTenantIds]);

    const handleGrantConsent = async (tenantId: string) => {
        if (!window.confirm(`Are you sure you want to grant data access to ${tenantMap.get(tenantId)}?`)) return;

        try {
            await database.write(async () => {
                await database.get<FarmerDealerConsentModel>('farmer_dealer_consents').create(c => {
                    c.farmerId = farmer.id;
                    c.tenantId = tenantId;
                    c.isActive = true;
                    c.grantedBy = 'OFFICER'; // Or 'FARMER' if a farmer app exists
                    c.syncStatusLocal = 'pending';
                });
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.DEALER_CONSENT_GRANTED;
                    log.description = `Consent granted to ${tenantMap.get(tenantId)}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Consent granted successfully.', type: 'success' });
        } catch (e) {
            console.error("Failed to grant consent", e);
            setNotification({ message: 'Failed to grant consent.', type: 'error' });
        }
    };

    const handleConfirmRevoke = async () => {
        if (!consentToRevoke) return;
        const tenantToRevoke = consentToRevoke;
        setConsentToRevoke(null);

        try {
             await database.write(async () => {
                await tenantToRevoke.update(c => {
                    c.isActive = false;
                });
                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.DEALER_CONSENT_REVOKED;
                    log.description = `Consent revoked from ${tenantMap.get(tenantToRevoke.tenantId)}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Consent revoked successfully.', type: 'success' });
        } catch(e) {
             console.error("Failed to revoke consent", e);
             setNotification({ message: 'Failed to revoke consent.', type: 'error' });
        }
    };

    const allConsentedTenants = useMemo(() => {
        const consented = activeConsents.map(c => ({
            id: c.tenantId,
            name: tenantMap.get(c.tenantId) || 'Unknown Tenant',
            isOriginal: false,
            consentRecord: c,
        }));

        // Add the original tenant if they don't have a separate consent record yet
        if (!activeConsentTenantIds.has(farmer.tenantId)) {
            consented.unshift({
                id: farmer.tenantId,
                name: tenantMap.get(farmer.tenantId) || 'Unknown Original Tenant',
                isOriginal: true,
                consentRecord: null, // No separate record to revoke
            });
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
                            {tenant.consentRecord && (
                                <button onClick={() => setConsentToRevoke(tenant.consentRecord!)} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 font-semibold">
                                    Revoke Access
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
             <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Dealers in {getGeoName('mandal', farmer)}</h3>
                {availableDealers.length > 0 ? (
                    <div className="space-y-3">
                        {availableDealers.map(tenant => (
                            <div key={tenant.id} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
                                <p className="font-semibold text-gray-700">{tenant.name}</p>
                                <button onClick={() => handleGrantConsent(tenant.id)} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 font-semibold">
                                    Grant Access
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No other dealers are currently servicing this area.</p>
                )}
            </div>

            {consentToRevoke && (
                <ConfirmationModal
                    isOpen={!!consentToRevoke}
                    title="Revoke Access?"
                    message={<>Are you sure you want to revoke data access for <strong>{tenantMap.get(consentToRevoke.tenantId)}</strong>? They will no longer be able to view this farmer's details.</>}
                    onConfirm={handleConfirmRevoke}
                    onCancel={() => setConsentToRevoke(null)}
                    confirmText="Revoke"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
        </div>
    );
});


const InnerFarmerDetailsPage: React.FC<{ farmer: FarmerModel; subsidyPayments: SubsidyPaymentModel[], activityLogs: ActivityLogModel[], plots: PlotModel[], resourceDistributions: ResourceDistributionModel[] } & Omit<FarmerDetailsPageProps, 'farmerId' | 'database'>> = ({
    farmer,
    subsidyPayments,
    activityLogs,
    plots,
    resourceDistributions,
    users,
    currentUser,
    onBack,
    permissions,
    setNotification,
    allTenants,
    allTerritories
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showDistributionModal, setShowDistributionModal] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<SubsidyPaymentModel | null>(null);
    const [plotFormState, setPlotFormState] = useState<{ isOpen: boolean; plot?: Plot | null }>({ isOpen: false });
    const [plotToDelete, setPlotToDelete] = useState<PlotModel | null>(null);
    const [isLiveAssistantOpen, setIsLiveAssistantOpen] = useState(false);
    const [plantingRecordModal, setPlantingRecordModal] = useState<{ isOpen: boolean; plotId?: string; record?: PlantingRecord | null; }>({ isOpen: false });
    const [recordToDelete, setRecordToDelete] = useState<PlantingRecordModel | null>(null);
    const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
    const [selectedHarvestDetails, setSelectedHarvestDetails] = useState<(CombinedHarvestData & { farmerName: string; }) | null>(null);
    const [isKycModalOpen, setIsKycModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const database = useDatabase();

    // Refactored state for payment modal
    const [paymentModalInfo, setPaymentModalInfo] = useState<{ isOpen: boolean; stage?: PaymentStage; existingPayment?: SubsidyPaymentModel | null }>({ isOpen: false });
    
    // Fetch all available resources for the distribution form dropdown
    const allResources = useQuery(useMemo(() => database.get<ResourceModel>('resources').query(Q.sortBy('name', Q.asc)), [database]));
    const resourceMap = useMemo(() => new Map(allResources.map(r => [r.id, r])), [allResources]);

    const plainPlots = useMemo(() => plots.map(p => plotModelToPlain(p) as Plot), [plots]);

    // State for voice notes
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    const tenantMap = useMemo(() => new Map(allTenants.map(t => [t.id, t.name])), [allTenants]);
    const currentTenantName = farmer ? tenantMap.get(farmer.tenantId) || 'Unknown' : '...';


    const handleUpdateFarmer = useCallback(async (updatedFarmerData: Farmer, photoFile?: File) => {
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
            await farmer.update(record => {
                const { id, createdAt, createdBy, hap_id, asoId, ...updatableData } = updatedFarmerData;
                Object.assign(record, {
                    ...updatableData,
                    photo: photoBase64,
                    syncStatusLocal: 'pending',
                    updatedBy: currentUser.id,
                });
            });
        });
        setIsEditModalOpen(false);
        setNotification({ message: 'Farmer details updated successfully.', type: 'success' });
    }, [database, farmer, currentUser.id, setNotification]);


    const handleSavePayment = useCallback(async (paymentData: Omit<SubsidyPayment, 'syncStatus' | 'createdAt' | 'createdBy' | 'farmerId' | 'tenantId'>) => {
        try {
            const paymentsCollection = database.get<SubsidyPaymentModel>('subsidy_payments');
            
            if (paymentData.id && paymentModalInfo.existingPayment) { // This is an update
                await database.write(async () => {
                    await paymentModalInfo.existingPayment!.update(rec => {
                        rec.paymentDate = paymentData.paymentDate;
                        rec.amount = paymentData.amount;
                        rec.utrNumber = paymentData.utrNumber;
                        rec.paymentStage = paymentData.paymentStage;
                        rec.notes = paymentData.notes;
                        rec.syncStatusLocal = 'pending';
                    });
                });
                setNotification({ message: 'Payment updated successfully.', type: 'success' });
            } else { // This is a create
                await database.write(async writer => {
                    await paymentsCollection.create(rec => {
                        rec.farmerId = farmer.id;
                        rec.paymentDate = paymentData.paymentDate;
                        rec.amount = paymentData.amount;
                        rec.utrNumber = paymentData.utrNumber;
                        rec.paymentStage = paymentData.paymentStage;
                        rec.notes = paymentData.notes;
                        rec.createdBy = currentUser.id;
                        rec.syncStatusLocal = 'pending';
                        rec.tenantId = farmer.tenantId; // Assign tenant ID
                    });
    
                    const activityLogsCollection = database.get<ActivityLogModel>('activity_logs');
                    await activityLogsCollection.create(log => {
                        log.farmerId = farmer.id;
                        log.activityType = ActivityType.PAYMENT_RECORDED;
                        log.description = `${paymentData.paymentStage} of ₹${paymentData.amount.toLocaleString()} recorded.`;
                        log.createdBy = currentUser.id;
                        log.tenantId = farmer.tenantId; // Assign tenant ID
                    });
                });
                setNotification({ message: 'Payment recorded successfully.', type: 'success' });
            }
        } catch(error) {
            console.error("Failed to save payment:", error);
            setNotification({ message: 'Failed to save payment. Please try again.', type: 'error' });
        } finally {
            setPaymentModalInfo({ isOpen: false });
        }
    }, [database, farmer, currentUser.id, setNotification, paymentModalInfo.existingPayment]);

    const handleSaveDistribution = useCallback(async (distributionData: any) => {
        try {
            await database.write(async () => {
                await database.get<ResourceDistributionModel>('resource_distributions').create(rec => {
                    rec.farmerId = farmer.id;
                    rec.resourceId = distributionData.resourceId;
                    rec.quantity = distributionData.quantity;
                    rec.distributionDate = distributionData.distributionDate;
                    rec.notes = distributionData.notes;
                    rec.createdBy = currentUser.id;
                    rec.syncStatusLocal = 'pending';
                    rec.tenantId = farmer.tenantId;
                });
    
                const resource = resourceMap.get(distributionData.resourceId);
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.RESOURCE_DISTRIBUTED;
                    log.description = `Distributed ${distributionData.quantity} ${resource?.unit || 'items'} of ${resource?.name || 'Unknown Resource'}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            });
            setNotification({ message: 'Resource distribution recorded successfully.', type: 'success' });
            setShowDistributionModal(false);
        } catch(error) {
            console.error("Failed to save distribution:", error);
            setNotification({ message: 'Failed to save distribution. Please try again.', type: 'error' });
            setShowDistributionModal(false);
        }
    }, [database, farmer, currentUser.id, resourceMap, setNotification]);


    const handleDeletePayment = (payment: SubsidyPaymentModel) => {
        setPaymentToDelete(payment);
    };

    const handleConfirmDeletePayment = async () => {
        if (paymentToDelete) {
            await database.write(async () => {
                await paymentToDelete.destroyPermanently();
            });
            setNotification({ message: 'Payment record deleted.', type: 'success' });
            setPaymentToDelete(null);
        }
    };
    
    const handleToggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setNotification({ message: 'Speech recognition is not supported in this browser.', type: 'error' });
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.interimResults = true;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };
        recognition.onerror = (event: any) => {
            setNotification({ message: `Speech recognition error: ${event.error}`, type: 'error' });
            setIsRecording(false);
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // For now, let's just append final results to avoid complexity with interim results.
            if (finalTranscript) {
                setTranscript(prev => (prev ? prev + ' ' : '') + finalTranscript.trim());
            }
        };
        
        recognition.start();
    };
    
    const handleSaveVoiceNote = async () => {
        if (!transcript.trim()) return;

        try {
            await database.write(async () => {
                const activityLogsCollection = database.get<ActivityLogModel>('activity_logs');
                await activityLogsCollection.create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.VOICE_NOTE;
                    log.description = transcript.trim();
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            });
            setNotification({ message: 'Voice note saved successfully.', type: 'success' });
            setTranscript('');
        } catch (error) {
            console.error('Failed to save voice note:', error);
            setNotification({ message: 'Failed to save voice note.', type: 'error' });
        }
    };
    
    const handleSavePlot = useCallback(async (plotData: Partial<Plot>) => {
        try {
            await database.write(async () => {
                if (plotData.id) { // Edit mode
                    const plotToUpdate = await database.get<PlotModel>('plots').find(plotData.id);
                    await plotToUpdate.update(p => {
                        Object.assign(p, { ...plotData, syncStatusLocal: 'pending' });
                    });
                    setNotification({ message: 'Plot updated successfully.', type: 'success' });
                } else { // Create mode
                    await database.get<PlotModel>('plots').create(p => {
                        Object.assign(p, { 
                            ...plotData, 
                            syncStatusLocal: 'pending',
                            tenantId: farmer.tenantId,
                        });
                    });
                    setNotification({ message: 'Plot added successfully.', type: 'success' });
                }
                
                // Log activity
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.PLANTATION_UPDATE;
                    log.description = plotData.id ? `Updated plot details (${plotData.acreage} acres).` : `Added a new plot of ${plotData.acreage} acres.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            });
        } catch (error) {
            console.error("Failed to save plot:", error);
            setNotification({ message: 'Failed to save plot. Please try again.', type: 'error' });
        } finally {
            setPlotFormState({ isOpen: false });
        }
    }, [database, farmer, currentUser.id, setNotification]);

    const handleDeletePlot = (plot: Plot) => {
        database.get<PlotModel>('plots').find(plot.id).then(plotModel => {
            setPlotToDelete(plotModel);
        });
    };

    const handleConfirmDeletePlot = async () => {
        if (plotToDelete) {
            await database.write(async () => {
                await plotToDelete.destroyPermanently();
            });
            setNotification({ message: 'Plot deleted.', type: 'success' });
            setPlotToDelete(null);
        }
    };
    
    // --- NEW Planting Record Handlers ---
    const handleSavePlantingRecord = useCallback(async (recordData: Partial<PlantingRecord>, mode: 'create' | 'edit') => {
        try {
            await database.write(async () => {
                if (mode === 'edit' && recordData.id) {
                    const recordToUpdate = await database.get<PlantingRecordModel>('planting_records').find(recordData.id);
                    await recordToUpdate.update(r => { Object.assign(r, { ...recordData, syncStatusLocal: 'pending' }); });
                    setNotification({ message: 'Planting record updated.', type: 'success' });
                } else {
                    await database.get<PlantingRecordModel>('planting_records').create(r => {
                        Object.assign(r, { ...recordData, syncStatusLocal: 'pending', tenantId: farmer.tenantId });
                    });
                    setNotification({ message: 'Planting record added.', type: 'success' });
                }
                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.PLANTATION_UPDATE;
                    log.description = `${mode === 'edit' ? 'Updated' : 'Added'} planting record for variety "${recordData.geneticVariety}".`;
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            });
        } catch (error) {
            console.error("Failed to save planting record:", error);
            setNotification({ message: 'Failed to save planting record.', type: 'error' });
        } finally {
            setPlantingRecordModal({ isOpen: false });
        }
    }, [database, farmer, currentUser.id, setNotification]);
    
    const handleDeletePlantingRecord = (record: PlantingRecordModel) => {
        setRecordToDelete(record);
    };

    const handleConfirmDeleteRecord = async () => {
        if (recordToDelete) {
            await database.write(async () => {
                await recordToDelete.destroyPermanently();
            });
            setNotification({ message: 'Planting record deleted.', type: 'success' });
            setRecordToDelete(null);
        }
    };

    // --- NEW Harvest Handlers ---
    const handleSaveHarvest = async (data: any) => {
        try {
            await database.write(async () => {
                const harvest = await database.get<HarvestModel>('harvests').create(h => {
                    h.farmerId = data.harvest.farmerId;
                    h.harvestDate = data.harvest.harvestDate;
                    h.grossWeight = data.harvest.grossWeight;
                    h.tareWeight = data.harvest.tareWeight;
                    h.netWeight = data.harvest.netWeight;
                    h.assessedById = currentUser.id;
                    h.tenantId = currentUser.tenantId;
                    h.syncStatusLocal = 'pending';
                });

                const assessment = await database.get<QualityAssessmentModel>('quality_assessments').create(qa => {
                    qa.harvestId = harvest.id;
                    qa.overallGrade = data.assessment.overallGrade;
                    qa.priceAdjustment = 0; // Placeholder
                    qa.notes = data.assessment.notes;
                    qa.appealStatus = AppealStatus.None;
                    qa.assessmentDate = new Date().toISOString();
                    qa.tenantId = currentUser.tenantId;
                    qa.syncStatusLocal = 'pending';
                });

                for (const metric of data.metrics) {
                    await database.get('quality_metrics').create(m => {
                        (m as any).assessmentId = assessment.id;
                        (m as any).metricName = metric.metricName;
                        (m as any).metricValue = metric.metricValue;
                    });
                }

                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.HARVEST_RECORDED;
                    log.description = `Recorded a harvest of ${data.harvest.netWeight.toFixed(2)} kg with a grade of ${data.assessment.overallGrade}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = farmer.tenantId;
                });
            });
            setNotification({ message: 'Harvest assessment saved successfully!', type: 'success' });
            setIsHarvestModalOpen(false);
        } catch (error) {
            console.error('Failed to save harvest assessment:', error);
            setNotification({ message: 'Failed to save assessment.', type: 'error' });
        }
    };
    
    const handleUpdateAppealStatus = useCallback(async (assessmentId: string, newStatus: AppealStatus) => {
        try {
            await database.write(async () => {
                const assessmentModel = await database.get<QualityAssessmentModel>('quality_assessments').find(assessmentId);
                await assessmentModel.update(a => {
                    a.appealStatus = newStatus;
                    a.syncStatusLocal = 'pending';
                });

                const harvest = await assessmentModel.harvest.fetch();
                
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = harvest!.farmerId;
                    log.activityType = ActivityType.QUALITY_APPEAL_STATUS_CHANGED;
                    log.description = `Appeal status for harvest on ${new Date(harvest!.harvestDate).toLocaleDateString()} changed to ${newStatus}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            // Optimistically update the UI
            setSelectedHarvestDetails(prev => {
                if (prev && prev.assessment) {
                    return { ...prev, assessment: { ...prev.assessment, appealStatus: newStatus } };
                }
                return prev;
            });
            setNotification({ message: 'Appeal status updated successfully.', type: 'success' });
        } catch (e) {
            console.error("Failed to update appeal status", e);
            setNotification({ message: 'Failed to update status.', type: 'error' });
        }
    }, [database, currentUser, setNotification]);


    const handleExecuteCoPilotAction = useCallback((actionName: string) => {
        switch (actionName) {
            case 'SHOW_PROFIT_SIMULATOR':
                setActiveTab('simulator');
                setNotification({
                    message: "CoPilot switched view to the Profitability Simulator.",
                    type: 'info'
                });
                break;
            default:
                console.warn(`Unknown CoPilot action: ${actionName}`);
                setNotification({
                    message: `CoPilot suggested an unknown action: ${actionName}`,
                    type: 'info'
                });
        }
    }, [setNotification]);

    const getUserName = (userId?: string) => users.find(u => u.id === userId)?.name || 'System';
    const canEdit = permissions.has(Permission.CAN_EDIT_FARMER);

    if (!farmer) return <div className="text-center p-10">Farmer not found or you do not have permission to view them.</div>;

    const TabButton: React.FC<{ tab: string, label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 ${activeTab === tab ? 'text-green-600 border-green-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}
        >
            {label}
        </button>
    );
    
    const getTimelineIcon = (type: string) => {
        switch (type) {
            case ActivityType.REGISTRATION:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>;
            case ActivityType.STATUS_CHANGE:
                 return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v1h-2V4H7v1H5V4zM5 7v10a2 2 0 002 2h6a2 2 0 002-2V7H5zm2 4h6a1 1 0 110 2H7a1 1 0 110-2z" /></svg>;
            case ActivityType.ASSISTANCE_STATUS_CHANGE:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 005 18h10a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clipRule="evenodd" /></svg>;
            case ActivityType.PAYMENT_RECORDED:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134 0V7.418zM12.5 8.5h-5a2.5 2.5 0 000 5h5a2.5 2.5 0 000-5zM11 10a1 1 0 11-2 0 1 1 0 012 0z" /><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8 6a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>;
            case ActivityType.RESOURCE_DISTRIBUTED:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
            case ActivityType.VOICE_NOTE:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>;
            case ActivityType.HARVEST_RECORDED:
                 return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
            case ActivityType.TRAINING_ATTENDED:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>;
            default:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
        }
    };

    return (
        <div className="bg-gray-50 min-h-full p-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Directory
                    </button>
                    {canEdit && (
                        <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">
                            Edit Farmer
                        </button>
                    )}
                </div>
                
                <div className="bg-white rounded-lg shadow-xl p-8">
                     <h1 className="text-3xl font-bold text-gray-800">{farmer.fullName}</h1>
                     <p className="text-gray-500 font-mono">{farmer.hapId}</p>
                </div>

                <div className="mt-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto">
                            <TabButton tab="profile" label="Profile" />
                            <TabButton tab="service_providers" label="Service Providers" />
                            <TabButton tab="kyc" label="KYC & Bank" />
                            <TabButton tab="copilot" label="CoPilot" />
                            <TabButton tab="harvests" label="Harvests" />
                            <TabButton tab="traceability" label="Traceability" />
                            <TabButton tab="assistance" label="Assistance" />
                            <TabButton tab="simulator" label="Simulator" />
                            <TabButton tab="subsidy" label="Subsidy Eligibility" />
                            <TabButton tab="land" label="Land & Plantation" />
                            <TabButton tab="payments" label="Payment History" />
                            <TabButton tab="resources" label="Resources" />
                            <TabButton tab="timeline" label="Timeline" />
                            <TabButton tab="territory" label="Territory" />
                        </nav>
                    </div>
                     <div className="mt-6 bg-white rounded-lg shadow-xl p-8">
                        {activeTab === 'profile' && (
                             <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                <DetailItem label="Full Name" value={farmer.fullName} />
                                <DetailItem label="Father/Husband Name" value={farmer.fatherHusbandName} />
                                <DetailItem label="Mobile Number" value={farmer.mobileNumber} />
                                <DetailItem label="Address" value={farmer.address} />
                                <DetailItem label="Aadhaar Number" value={`**** **** ${farmer.aadhaarNumber.slice(-4)}`} />
                                <DetailItem label="Gender" value={farmer.gender} />
                                <DetailItem label="Location" value={`${getGeoName('village', { district: farmer.district, mandal: farmer.mandal, village: farmer.village })}, ${getGeoName('mandal', { district: farmer.district, mandal: farmer.mandal })}`} />
                                <DetailItem label="District" value={getGeoName('district', { district: farmer.district })} />
                                <DetailItem label="Status" value={farmer.status} />
                                <DetailItem label="Registered By" value={getUserName(farmer.createdBy)} />
                                <DetailItem label="Registration Date" value={new Date(farmer.registrationDate).toLocaleDateString()} />
                            </dl>
                        )}
                        {activeTab === 'service_providers' && (
                            <ServiceProvidersTab
                                farmer={farmer}
                                allTenants={allTenants}
                                allTerritories={allTerritories}
                                currentUser={currentUser}
                                database={database}
                                setNotification={setNotification}
                            />
                        )}
                        {activeTab === 'kyc' && (
                             <React.Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                                <KycTabContent farmer={farmer} onOpenModal={() => setIsKycModalOpen(true)} />
                            </React.Suspense>
                        )}
                        {activeTab === 'copilot' && (
                            <React.Suspense fallback={<div className="text-center p-10">Loading CoPilot...</div>}>
                                <CoPilotSuggestions
                                    farmer={farmerModelToPlain(farmer)!}
                                    plots={plots.map(p => plotModelToPlain(p)!)}
                                />
                            </React.Suspense>
                        )}
                        {activeTab === 'harvests' && (
                            <React.Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                                <HarvestsTabContent
                                    farmer={farmer}
                                    database={database}
                                    onRecord={() => setIsHarvestModalOpen(true)}
                                    onDetails={(data) => setSelectedHarvestDetails({ ...data, farmerName: farmer.fullName })}
                                />
                            </React.Suspense>
                        )}
                         {activeTab === 'traceability' && (
                            <React.Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                                <TraceabilityTabContent
                                    farmer={farmer}
                                    onAdd={(plotId) => setPlantingRecordModal({ isOpen: true, plotId })}
                                    onEdit={(record) => setPlantingRecordModal({ isOpen: true, plotId: record.plotId, record })}
                                    onDelete={handleDeletePlantingRecord}
                                />
                            </React.Suspense>
                         )}
                        {activeTab === 'simulator' && (
                            <React.Suspense fallback={<div className="text-center p-10">Loading Simulator...</div>}>
                                <ProfitabilitySimulator plots={plainPlots} />
                            </React.Suspense>
                        )}
                        {activeTab === 'assistance' && <AssistanceTabContent farmer={farmer} currentUser={currentUser} setNotification={setNotification} />}
                         {activeTab === 'subsidy' && (
                            <SubsidyStatusView 
                                farmer={farmerModelToPlain(farmer)!} 
                                payments={subsidyPayments}
                                onRecordPayment={(stage) => setPaymentModalInfo({ isOpen: true, stage })}
                            />
                        )}
                        {activeTab === 'land' && (
                            <PlotsTabContent
                                farmer={farmer}
                                onAdd={() => setPlotFormState({ isOpen: true, plot: null })}
                                onEdit={(plot) => setPlotFormState({ isOpen: true, plot })}
                                onDelete={handleDeletePlot}
                            />
                        )}
                         {activeTab === 'bank' && (
                            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                <DetailItem label="Bank Account Number" value={`...${farmer.bankAccountNumber.slice(-4)}`} />
                                <DetailItem label="IFSC Code" value={farmer.ifscCode} />
                                <DetailItem label="Account Verified" value={farmer.accountVerified ? 'Yes' : 'No'} />
                            </dl>
                        )}
                         {activeTab === 'payments' && (
                           <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Payment History</h3>
                                    {canEdit && <button onClick={() => setPaymentModalInfo({ isOpen: true })} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Record New Payment</button>}
                                </div>
                                <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UTR/DD No.</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                                            {canEdit && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {subsidyPayments.length > 0 ? subsidyPayments.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-4 py-3 text-sm">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-sm">₹{p.amount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm">{p.paymentStage}</td>
                                            <td className="px-4 py-3 text-sm font-mono">{p.utrNumber}</td>
                                            <td className="px-4 py-3 text-sm">{getUserName(p.createdBy)}</td>
                                            {canEdit && (
                                                <td className="px-4 py-3 text-sm flex gap-4">
                                                    <button onClick={() => setPaymentModalInfo({ isOpen: true, existingPayment: p })} className="text-green-600 hover:text-green-900 font-medium">Edit</button>
                                                    <button
                                                        onClick={() => handleDeletePayment(p)}
                                                        disabled={p.syncStatusLocal === 'synced'}
                                                        className="text-red-600 hover:text-red-900 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                                                        title={p.syncStatusLocal === 'synced' ? "Cannot delete synced records" : "Delete payment"}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={canEdit ? 6 : 5} className="text-center py-8 text-gray-500">No subsidy payments recorded.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'resources' && (
                           <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Resource Distribution History</h3>
                                    {canEdit && <button onClick={() => setShowDistributionModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Distribute Resource</button>}
                                </div>
                                <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Distributed By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {resourceDistributions.length > 0 ? resourceDistributions.map(d => (
                                        <tr key={d.id}>
                                            <td className="px-4 py-3 text-sm">{new Date(d.distributionDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-sm font-medium">{resourceMap.get(d.resourceId)?.name || d.resourceId}</td>
                                            <td className="px-4 py-3 text-sm">{d.quantity} {resourceMap.get(d.resourceId)?.unit}</td>
                                            <td className="px-4 py-3 text-sm">{getUserName(d.createdBy)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="text-center py-8 text-gray-500">No resources have been distributed to this farmer.</td></tr>
                                    )}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        )}
                        {activeTab === 'timeline' && (
                             <div>
                                <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
                                <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
                                    <h4 className="font-semibold text-gray-700 mb-2">Add Voice Note</h4>
                                    <div className="flex items-start gap-4">
                                        <button onClick={handleToggleRecording} className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
                                        </button>
                                        <div className="flex-1">
                                            <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder={isRecording ? "Listening..." : "Click the mic to start recording a field note..."} className="w-full p-2 border rounded-md" rows={3}></textarea>
                                            {transcript && <button onClick={handleSaveVoiceNote} className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Save Note</button>}
                                        </div>
                                    </div>
                                </div>
                                {activityLogs.length > 0 ? (
                                    <div className="relative border-l-2 border-gray-200 ml-3">
                                        {activityLogs.map((log) => (
                                            <div key={log.id} className="mb-8 ml-6">
                                                <span className="absolute -left-3.5 flex items-center justify-center w-7 h-7 bg-green-200 rounded-full ring-8 ring-white">
                                                    {getTimelineIcon(log.activityType)}
                                                </span>
                                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                                                    <p className="text-sm text-gray-800">{log.description}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        By {getUserName(log.createdBy)} on {new Date(log.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No activity recorded for this farmer yet.</p>
                                )}
                            </div>
                        )}
                        {activeTab === 'territory' && (
                            <div>
                                <h3 className="text-lg font-semibold">Territory Information</h3>
                                <div className="mt-4 bg-gray-50 p-6 rounded-lg border">
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <DetailItem label="Current Tenant" value={currentTenantName} />
                                    </dl>
                                    <div className="mt-6 pt-6 border-t">
                                        <button 
                                            onClick={() => setIsTransferModalOpen(true)} 
                                            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold"
                                        >
                                            Initiate Transfer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {paymentModalInfo.isOpen && (
                <SubsidyPaymentForm
                    onClose={() => setPaymentModalInfo({ isOpen: false })}
                    onSubmit={handleSavePayment}
                    existingPayment={paymentModalInfo.existingPayment}
                    initialStage={paymentModalInfo.stage}
                />
            )}
            {showDistributionModal && (
                <DistributionForm
                    onClose={() => setShowDistributionModal(false)}
                    onSubmit={handleSaveDistribution}
                    resources={allResources}
                />
            )}
            {paymentToDelete && (
                <ConfirmationModal
                    isOpen={!!paymentToDelete}
                    title="Delete Payment Record?"
                    message="Are you sure you want to permanently delete this payment record? This action cannot be undone."
                    onConfirm={handleConfirmDeletePayment}
                    onCancel={() => setPaymentToDelete(null)}
                    confirmText="Delete"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
            {isEditModalOpen && farmer && (
                 <React.Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div></div>}>
                    <RegistrationForm
                        mode="edit"
                        existingFarmer={farmerModelToPlain(farmer)}
                        onSubmit={handleUpdateFarmer}
                        onCancel={() => setIsEditModalOpen(false)}
                        existingFarmers={[]}
                        setNotification={setNotification}
                        currentUser={currentUser}
                    />
                </React.Suspense>
            )}
            {plotFormState.isOpen && (
                <PlotFormModal
                    onClose={() => setPlotFormState({ isOpen: false })}
                    onSubmit={handleSavePlot}
                    plot={plotFormState.plot}
                    farmerId={farmer.id}
                />
            )}
            {plotToDelete && (
                <ConfirmationModal
                    isOpen={!!plotToDelete}
                    title="Delete Plot?"
                    message={<><p>Are you sure you want to permanently delete this plot of <strong>{plotToDelete.acreage} acres</strong>?</p><p className="mt-2 text-sm">This action cannot be undone.</p></>}
                    onConfirm={handleConfirmDeletePlot}
                    onCancel={() => setPlotToDelete(null)}
                    confirmText="Delete"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
             {isKycModalOpen && (
                <React.Suspense fallback={null}>
                    <KycOnboardingModal
                        farmer={farmerModelToPlain(farmer)!}
                        onClose={() => setIsKycModalOpen(false)}
                        setNotification={setNotification}
                    />
                </React.Suspense>
            )}
            {plantingRecordModal.isOpen && (
                <React.Suspense fallback={null}>
                    <PlantingRecordFormModal 
                        onClose={() => setPlantingRecordModal({ isOpen: false })}
                        onSubmit={handleSavePlantingRecord}
                        plotId={plantingRecordModal.plotId!}
                        plantingRecord={plantingRecordModal.record}
                    />
                </React.Suspense>
            )}
            {recordToDelete && (
                <ConfirmationModal
                    isOpen={!!recordToDelete}
                    title="Delete Planting Record?"
                    message="Are you sure you want to delete this genetic traceability record? This action cannot be undone."
                    onConfirm={handleConfirmDeleteRecord}
                    onCancel={() => setRecordToDelete(null)}
                    confirmText="Delete"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
            {isHarvestModalOpen && (
                <React.Suspense fallback={null}>
                    <HarvestForm 
                        allFarmers={[farmerModelToPlain(farmer)!]}
                        currentUser={currentUser}
                        onClose={() => setIsHarvestModalOpen(false)}
                        onSubmit={handleSaveHarvest}
                    />
                </React.Suspense>
            )}
            {selectedHarvestDetails && selectedHarvestDetails.assessment && (
                <React.Suspense fallback={null}>
                    <QualityAssessmentDetailsModal
                        assessmentData={{ ...selectedHarvestDetails, assessment: selectedHarvestDetails.assessment! }}
                        currentUser={currentUser}
                        onClose={() => setSelectedHarvestDetails(null)}
                        onUpdateAppealStatus={handleUpdateAppealStatus}
                    />
                </React.Suspense>
            )}
            {isLiveAssistantOpen && (
                <React.Suspense fallback={<div />}>
                    <LiveAssistantModal
                        farmer={farmerModelToPlain(farmer)!}
                        onClose={() => setIsLiveAssistantOpen(false)}
                        onExecuteAction={handleExecuteCoPilotAction}
                    />
                </React.Suspense>
            )}
            {isTransferModalOpen && farmer && (
                <TransferModal 
                    farmer={farmerModelToPlain(farmer)!}
                    currentUser={currentUser}
                    tenants={allTenants}
                    onClose={() => setIsTransferModalOpen(false)}
                    onSave={() => {
                        setIsTransferModalOpen(false);
                        setNotification({ message: 'Transfer request submitted.', type: 'success' });
                    }}
                />
            )}
            <button
                onClick={() => setIsLiveAssistantOpen(true)}
                className="fixed bottom-6 right-24 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 z-30"
                title="Start CoPilot Session"
                aria-label="Start CoPilot Session"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

const enhance = withObservables(['farmerId', 'currentUser'], ({ farmerId, database, currentUser }: { farmerId: string; database: Database; currentUser: User; }) => {
    const isSuperAdmin = currentUser.groupId === 'group-super-admin';
    const clauses = [Q.where('id', farmerId)];
    if (!isSuperAdmin) {
        clauses.push(Q.where('tenant_id', currentUser.tenantId));
    }
    return {
        farmers: database.get<FarmerModel>('farmers').query(...clauses).observe(),
    };
});


const EnhancedFarmerDetailsPage: React.FC<Omit<FarmerDetailsPageProps, 'database'>> = enhance((props) => {
    const { farmers, ...rest } = props as { farmers: FarmerModel[] } & Omit<FarmerDetailsPageProps, 'database'>;
    const farmer = farmers?.[0]; // The query will return an array with 0 or 1 item.
    const [subsidyPayments, setSubsidyPayments] = useState<SubsidyPaymentModel[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLogModel[]>([]);
    const [plots, setPlots] = useState<PlotModel[]>([]);
    const [resourceDistributions, setResourceDistributions] = useState<ResourceDistributionModel[]>([]);


    useEffect(() => {
        if (farmer) {
            const sub1 = farmer.subsidyPayments.observe().subscribe(setSubsidyPayments);
            const sub2 = farmer.activityLogs.observe().subscribe(setActivityLogs);
            const sub3 = farmer.resourceDistributions.observe().subscribe(setResourceDistributions);
            const sub4 = farmer.plots.observe().subscribe(setPlots);
            return () => {
                sub1.unsubscribe();
                sub2.unsubscribe();
                sub3.unsubscribe();
                sub4.unsubscribe();
            };
        }
    }, [farmer]);
    
    // The component will re-render when `farmer` changes. If it becomes undefined (e.g., user navigated to a farmer they can't see),
    // `InnerFarmerDetailsPage` will correctly show the "not found" message.
    return <InnerFarmerDetailsPage farmer={farmer!} subsidyPayments={subsidyPayments} activityLogs={activityLogs} plots={plots} resourceDistributions={resourceDistributions} {...rest} />;
});


export default EnhancedFarmerDetailsPage;