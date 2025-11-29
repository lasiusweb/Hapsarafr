
import { GEO_DATA } from '../data/geoData';
import { Farmer, FarmPlot, SubsidyPayment, User, Group, ActivityLog, Tenant, Resource, ResourceDistribution, CustomFieldDefinition, Task, Harvest, QualityAssessment, QualityMetric, ProcessingBatch, ProcessingStep, Equipment, ManualLedgerEntry, EquipmentLease, PlantingRecord, AgronomicInput, KhataRecord } from '../types';
import { FarmerModel, FarmPlotModel, SubsidyPaymentModel, UserModel, GroupModel, ActivityLogModel, TenantModel, ResourceModel, ResourceDistributionModel, CustomFieldDefinitionModel, TaskModel, HarvestModel, QualityAssessmentModel, QualityMetricModel, ProcessingBatchModel, ProcessingStepModel, EquipmentModel, ManualLedgerEntryModel, EquipmentLeaseModel, PlantingRecordModel, AgronomicInputModel } from '../db';
import DOMPurify from 'dompurify';


export const sanitizeHTML = (html: string) => {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'b', 'i', 'br'],
    });
};

export const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

// --- Agros: Unit Normalization Logic ---
export const normalizeToKg = (quantity: number, unit: string): number => {
    const q = parseFloat(String(quantity));
    if (isNaN(q)) return 0;

    switch (unit.toLowerCase()) {
        case 'tons':
        case 'ton':
            return q * 1000;
        case 'quintal':
        case 'quintals':
            return q * 100;
        case 'kg':
        case 'kgs':
            return q;
        case 'bunch': // Avg weight of FFB bunch approx 20kg
            return q * 20;
        case 'bag': // Standard gunny bag approx 50kg
            return q * 50;
        case 'tractor': // Small tractor approx 3 tons
            return q * 3000;
        default:
            return q;
    }
};

export const getUnitLabel = (unit: string): string => {
    switch (unit.toLowerCase()) {
        case 'tons': return 'Tons (1000kg)';
        case 'quintal': return 'Quintals (100kg)';
        case 'kg': return 'Kilograms';
        case 'bunch': return 'Bunches (~20kg)';
        case 'bag': return 'Bags (~50kg)';
        default: return unit;
    }
};

const modelToPlain = <T,>(model: any): T | null => {
    if (!model) return null;
    const plain = { ...model._raw };
    delete plain._status;
    delete plain._changed;
    return plain as T;
};

export const farmerModelToPlain = (model: FarmerModel | null): Farmer | null => model ? modelToPlain<Farmer>(model) : null;
export const farmPlotModelToPlain = (model: FarmPlotModel | null): FarmPlot | null => {
    if (!model) return null;
    const plainPlot: any = modelToPlain<FarmPlot>(model);
    plainPlot.is_replanting = !!plainPlot.is_replanting;
    return plainPlot;
};
export const plantingRecordModelToPlain = (model: PlantingRecordModel | null): PlantingRecord | null => model ? modelToPlain<PlantingRecord>(model) : null;
export const subsidyPaymentModelToPlain = (model: SubsidyPaymentModel | null): SubsidyPayment | null => model ? modelToPlain<SubsidyPayment>(model) : null;
export const userModelToPlain = (model: UserModel | null): User | null => model ? modelToPlain<User>(model) : null;
export const groupModelToPlain = (model: GroupModel | null): Group | null => model ? modelToPlain<Group>(model) : null;
export const activityLogModelToPlain = (model: ActivityLogModel | null): ActivityLog | null => model ? modelToPlain<ActivityLog>(model) : null;
export const tenantModelToPlain = (model: TenantModel | null): Tenant | null => model ? modelToPlain<Tenant>(model) : null;
export const resourceModelToPlain = (model: ResourceModel | null): Resource | null => model ? modelToPlain<Resource>(model) : null;
export const resourceDistributionModelToPlain = (model: ResourceDistributionModel | null): ResourceDistribution | null => model ? modelToPlain<ResourceDistribution>(model) : null;
export const customFieldDefinitionModelToPlain = (model: CustomFieldDefinitionModel | null): CustomFieldDefinition | null => model ? modelToPlain<CustomFieldDefinition>(model) : null;
export const taskModelToPlain = (model: TaskModel | null): Task | null => model ? modelToPlain<Task>(model) : null;
export const harvestModelToPlain = (model: HarvestModel | null): Harvest | null => model ? modelToPlain<Harvest>(model) : null;
export const qualityAssessmentModelToPlain = (model: QualityAssessmentModel | null): QualityAssessment | null => model ? modelToPlain<QualityAssessment>(model) : null;
export const qualityMetricModelToPlain = (model: QualityMetricModel | null): QualityMetric | null => model ? modelToPlain<QualityMetric>(model) : null;
export const processingBatchModelToPlain = (model: ProcessingBatchModel | null): ProcessingBatch | null => model ? modelToPlain<ProcessingBatch>(model) : null;
export const processingStepModelToPlain = (model: ProcessingStepModel | null): ProcessingStep | null => model ? modelToPlain<ProcessingStep>(model) : null;
export const equipmentModelToPlain = (model: EquipmentModel | null): Equipment | null => model ? modelToPlain<Equipment>(model) : null;
export const manualLedgerEntryModelToPlain = (model: ManualLedgerEntryModel | null): ManualLedgerEntry | null => model ? modelToPlain<ManualLedgerEntry>(model) : null;
export const equipmentLeaseModelToPlain = (model: EquipmentLeaseModel | null): EquipmentLease | null => model ? modelToPlain<EquipmentLease>(model) : null;
export const agronomicInputModelToPlain = (model: AgronomicInputModel | null): AgronomicInput | null => model ? modelToPlain<AgronomicInput>(model) : null;


export const getGeoName = (type: 'district' | 'mandal' | 'village', farmer: { district: string, mandal?: string, village?: string }): string => {
    const district = GEO_DATA.find(d => d.code === farmer.district);
    if (!district) return 'Unknown';
    if (type === 'district') return district.name;

    const mandal = district.mandals.find(m => m.code === farmer.mandal);
    if (!mandal) return 'Unknown';
    if (type === 'mandal') return mandal.name;

    const village = mandal.villages.find(v => v.code === farmer.village);
    return village ? village.name : 'Unknown';
};

export const generateWhatsAppLink = (mobileNumber: string, message: string) => {
    // Remove non-numeric characters
    const cleanNumber = mobileNumber.replace(/\D/g, '');
    // Ensure country code (assuming India +91 if not present and length is 10)
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
};

export const calculateReputationScore = (khataRecords: KhataRecord[]): number => {
    if (khataRecords.length === 0) return 50; // Start neutral

    let score = 50;
    const paidOnTime = khataRecords.filter(r => r.status === 'PAID').length;
    const pending = khataRecords.filter(r => r.status === 'PENDING' || r.status === 'ACKNOWLEDGED').length;
    const disputed = khataRecords.filter(r => r.status === 'DISPUTED').length;
    
    // Basic heuristic
    score += (paidOnTime * 5);
    score -= (disputed * 10);
    
    // Cap between 0 and 100
    return Math.max(0, Math.min(100, score));
};
