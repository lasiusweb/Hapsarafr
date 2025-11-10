import React, { useState, useMemo, useEffect } from 'react';
import { Harvest, QualityAssessment, Farmer, User, QualityMetric, AppealStatus, Permission } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { QualityMetricModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { qualityMetricModelToPlain } from '../lib/utils';

interface CombinedData {
    harvest: Harvest;
    assessment: QualityAssessment;
    farmerName: string;
}

interface QualityAssessmentDetailsModalProps {
    assessmentData: CombinedData;
    currentUser: User;
    onClose: () => void;
    onUpdateAppealStatus: (assessmentId: string, newStatus: AppealStatus) => void;
}

const DetailItem: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 font-semibold">{value || 'N/A'}</dd>
    </div>
);

const AppealStatusBadge: React.FC<{ status: AppealStatus }> = ({ status }) => {
    const colors: Record<AppealStatus, string> = {
        [AppealStatus.None]: 'bg-gray-100 text-gray-600',
        [AppealStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [AppealStatus.Approved]: 'bg-green-100 text-green-800',
        [AppealStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${colors[status]}`}>{status}</span>;
};


const QualityAssessmentDetailsModal: React.FC<QualityAssessmentDetailsModalProps> = ({ assessmentData, currentUser, onClose, onUpdateAppealStatus }) => {
    const { harvest, assessment, farmerName } = assessmentData;
    const database = useDatabase();
    
    const metricsQuery = useMemo(() => database.get<QualityMetricModel>('quality_metrics').query(Q.where('assessment_id', assessment.id)), [database, assessment.id]);
    const metricModels = useQuery(metricsQuery);
    const metrics = useMemo(() => metricModels.map(m => qualityMetricModelToPlain(m)!), [metricModels]);

    // A simple permission check, assuming editors can manage appeals
    const canManageAppeals = currentUser.groupId.includes('admin');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Harvest Assessment Details</h2>
                    <p className="text-sm text-gray-500">For {farmerName} on {new Date(harvest.harvestDate).toLocaleDateString()}</p>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto">
                    {/* Harvest Details */}
                    <section>
                        <h3 className="text-lg font-semibold text-green-700 mb-4 border-b pb-2">Harvest Details</h3>
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                            <DetailItem label="Gross Weight" value={`${harvest.grossWeight} kg`} />
                            <DetailItem label="Tare Weight" value={`${harvest.tareWeight} kg`} />
                            <DetailItem label="Net Weight" value={`${harvest.netWeight} kg`} />
                            <DetailItem label="Assessed By" value={currentUser.name} />
                        </dl>
                    </section>

                    {/* Quality Metrics */}
                     <section>
                        <h3 className="text-lg font-semibold text-green-700 mb-4 border-b pb-2">Quality Metrics</h3>
                        <div className="space-y-3">
                            {metrics.length > 0 ? metrics.map(metric => (
                                <div key={metric.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                    <span className="font-medium text-gray-700">{metric.metricName}</span>
                                    <span className="font-bold text-gray-900">{metric.metricValue}</span>
                                </div>
                            )) : <p className="text-gray-500">No specific metrics were recorded.</p>}
                        </div>
                    </section>

                    {/* Summary & Appeal */}
                    <section>
                         <h3 className="text-lg font-semibold text-green-700 mb-4 border-b pb-2">Summary & Appeal</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Final Assessment</h4>
                                <dl className="space-y-4">
                                    <DetailItem label="Overall Grade" value={assessment.overallGrade} />
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                                        <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded-md border">{assessment.notes || 'No notes provided.'}</dd>
                                    </div>
                                </dl>
                             </div>
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Farmer Appeal Status</h4>
                                <div className="p-4 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-600 font-medium">Current Status:</span>
                                        <AppealStatusBadge status={assessment.appealStatus} />
                                    </div>
                                    {canManageAppeals && (
                                        <div className="pt-4 border-t">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Update Status:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {assessment.appealStatus !== AppealStatus.Pending && <button onClick={() => onUpdateAppealStatus(assessment.id, AppealStatus.Pending)} className="px-3 py-1 text-xs font-semibold rounded-md bg-yellow-500 text-white hover:bg-yellow-600">Mark as Pending</button>}
                                                {assessment.appealStatus !== AppealStatus.Approved && <button onClick={() => onUpdateAppealStatus(assessment.id, AppealStatus.Approved)} className="px-3 py-1 text-xs font-semibold rounded-md bg-green-500 text-white hover:bg-green-600">Approve</button>}
                                                {assessment.appealStatus !== AppealStatus.Rejected && <button onClick={() => onUpdateAppealStatus(assessment.id, AppealStatus.Rejected)} className="px-3 py-1 text-xs font-semibold rounded-md bg-red-500 text-white hover:bg-red-600">Reject</button>}
                                                {assessment.appealStatus !== AppealStatus.None && <button onClick={() => onUpdateAppealStatus(assessment.id, AppealStatus.None)} className="px-3 py-1 text-xs font-semibold rounded-md bg-gray-500 text-white hover:bg-gray-600">Reset</button>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                             </div>
                         </div>
                    </section>
                </div>
                
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Close</button>
                </div>
            </div>
        </div>
    );
};

export default QualityAssessmentDetailsModal;