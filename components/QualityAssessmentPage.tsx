import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { HarvestModel, QualityAssessmentModel, ActivityLogModel } from '../db';
import { User, Farmer, Harvest, QualityAssessment, AppealStatus, ActivityType } from '../types';
import { harvestModelToPlain, qualityAssessmentModelToPlain } from '../lib/utils';
import HarvestForm from './HarvestForm';
import QualityAssessmentDetailsModal from './QualityAssessmentDetailsModal';

interface QualityAssessmentPageProps {
    onBack: () => void;
    currentUser: User;
    allFarmers: Farmer[];
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

interface CombinedData {
    harvest: Harvest;
    assessment: QualityAssessment | null;
    farmerName: string;
}

const AppealStatusBadge: React.FC<{ status: AppealStatus }> = ({ status }) => {
    const colors: Record<AppealStatus, string> = {
        [AppealStatus.None]: 'bg-gray-100 text-gray-600',
        [AppealStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [AppealStatus.Approved]: 'bg-green-100 text-green-800',
        [AppealStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

const QualityAssessmentPage: React.FC<QualityAssessmentPageProps> = ({ onBack, currentUser, allFarmers, setNotification }) => {
    const database = useDatabase();
    const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState<CombinedData | null>(null);
    
    const harvests = useQuery(useMemo(() => database.get<HarvestModel>('harvests').query(), [database]));
    const assessments = useQuery(useMemo(() => database.get<QualityAssessmentModel>('quality_assessments').query(), [database]));

    const farmerMap = useMemo(() => new Map(allFarmers.map(f => [f.id, f])), [allFarmers]);
    const assessmentMap = useMemo(() => new Map(assessments.map(a => [a.harvestId, a])), [assessments]);

    const combinedData: CombinedData[] = useMemo(() => {
        return harvests.map(harvest => {
            const farmer = farmerMap.get(harvest.farmerId);
            const assessment = assessmentMap.get(harvest.id);
            return {
                harvest: harvestModelToPlain(harvest)!,
                assessment: assessment ? qualityAssessmentModelToPlain(assessment) : null,
                farmerName: farmer?.fullName || 'Unknown Farmer',
            };
        }).sort((a, b) => new Date(b.harvest.harvestDate).getTime() - new Date(a.harvest.harvestDate).getTime());
    }, [harvests, assessmentMap, farmerMap]);

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
            });
            setNotification({ message: 'Harvest assessment saved successfully!', type: 'success' });
            setIsHarvestModalOpen(false);
        } catch (error) {
            console.error('Failed to save harvest assessment:', error);
            setNotification({ message: 'Failed to save assessment.', type: 'error' });
        }
    };

    const handleUpdateAppealStatus = useCallback(async (assessmentId: string, newStatus: AppealStatus) => {
        if (!window.confirm(`Are you sure you want to update the appeal status to "${newStatus}"?`)) {
            return;
        }

        try {
            await database.write(async () => {
                const assessmentModel = await database.get<QualityAssessmentModel>('quality_assessments').find(assessmentId);
                await assessmentModel.update(a => {
                    a.appealStatus = newStatus;
                    a.syncStatusLocal = 'pending';
                });

                const harvest = await assessmentModel.harvest.fetch();
                
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = harvest.farmerId;
                    log.activityType = ActivityType.QUALITY_APPEAL_STATUS_CHANGED;
                    log.description = `Appeal status for harvest on ${new Date(harvest.harvestDate).toLocaleDateString()} changed to ${newStatus}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            // Optimistically update the UI
            setSelectedDetails(prev => {
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
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Quality Assessment</h1>
                        <p className="text-gray-500">Record and review Fresh Fruit Bunch (FFB) harvest quality.</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <button onClick={() => setIsHarvestModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Record New Harvest</button>
                         <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            Back
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harvest Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Weight (kg)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Grade</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appeal Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {combinedData.map((data) => (
                                    <tr key={data.harvest.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.farmerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(data.harvest.harvestDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.harvest.netWeight.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{data.assessment?.overallGrade || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><AppealStatusBadge status={data.assessment?.appealStatus || AppealStatus.None} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button onClick={() => setSelectedDetails(data)} className="text-green-600 hover:text-green-800 font-semibold" disabled={!data.assessment}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {combinedData.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">No harvest assessments recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isHarvestModalOpen && (
                <HarvestForm
                    allFarmers={allFarmers}
                    currentUser={currentUser}
                    onClose={() => setIsHarvestModalOpen(false)}
                    onSubmit={handleSaveHarvest}
                />
            )}
            {selectedDetails && selectedDetails.assessment && (
                <QualityAssessmentDetailsModal
                    assessmentData={selectedDetails}
                    currentUser={currentUser}
                    onClose={() => setSelectedDetails(null)}
                    onUpdateAppealStatus={handleUpdateAppealStatus}
                />
            )}
        </div>
    );
};

export default QualityAssessmentPage;
