// lib/dbConverters.ts
import { Farmer, FarmPlot, SubsidyPayment, User, Group, ActivityLog, Tenant, Resource, ResourceDistribution, CustomFieldDefinition, Task, Harvest, QualityAssessment, QualityMetric, ProcessingBatch, ProcessingStep, Equipment, ManualLedgerEntry, EquipmentLease, PlantingRecord, AgronomicInput } from '../types';
import { FarmerModel, FarmPlotModel, SubsidyPaymentModel, UserModel, GroupModel, ActivityLogModel, TenantModel, ResourceModel, ResourceDistributionModel, CustomFieldDefinitionModel, TaskModel, HarvestModel, QualityAssessmentModel, QualityMetricModel, ProcessingBatchModel, ProcessingStepModel, EquipmentModel, ManualLedgerEntryModel, EquipmentLeaseModel, PlantingRecordModel, AgronomicInputModel } from '../db';

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