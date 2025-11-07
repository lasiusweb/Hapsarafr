import React, { useState, useEffect, useMemo, useCallback, lazy, useRef } from 'react';
import { Database } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel, ResourceDistributionModel, ResourceModel, PlotModel } from '../db';
import { User, Permission, FarmerStatus, SubsidyPayment, Farmer, ActivityType, PaymentStage, Plot } from '../types';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import DistributionForm from './DistributionForm';
import AiReviewModal from './AiReviewModal';
import ConfirmationModal from './ConfirmationModal';
import { farmerModelToPlain, getGeoName, plotModelToPlain } from '../lib/utils';
import { useDatabase } from '../DatabaseContext';
import { Q } from '@nozbe/watermelondb';
import { useQuery } from '../hooks/useQuery';

const RegistrationForm = lazy(() => import('./RegistrationForm'));
const LiveAssistantModal = lazy(() => import('./LiveAssistantModal'));

// Extend window type for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}


interface FarmerDetailsPageProps {
    farmerId: string;
    database: Database;
    users: User[];
    currentUser: User;
    onBack: () => void;
    permissions: Set<Permission>;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
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

const PlotFormModal: React.FC<{ onClose: () => void; plot?: Plot | null }> = ({ onClose, plot }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{plot ? 'Edit Plot' : 'Add New Plot'}</h2>
            </div>
            <div className="p-8 text-center">
                <p className="text-lg font-semibold text-gray-700 mb-4">Coming Soon!</p>
                <p className="text-gray-500">The ability to add and edit individual farm plots is under development and will be available in a future update.</p>
            </div>
            <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Close</button>
            </div>
        </div>
    </div>
);

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


const InnerFarmerDetailsPage: React.FC<{ farmer: FarmerModel; subsidyPayments: SubsidyPaymentModel[], activityLogs: ActivityLogModel[], resourceDistributions: ResourceDistributionModel[] } & Omit<FarmerDetailsPageProps, 'farmerId' | 'database'>> = ({
    farmer,
    subsidyPayments,
    activityLogs,
    resourceDistributions,
    users,
    currentUser,
    onBack,
    permissions,
    setNotification
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showDistributionModal, setShowDistributionModal] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<SubsidyPaymentModel | null>(null);
    const [plotFormState, setPlotFormState] = useState<{ isOpen: boolean; plot?: Plot | null }>({ isOpen: false });
    const [isLiveAssistantOpen, setIsLiveAssistantOpen] = useState(false);
    const database = useDatabase();

    // Refactored state for payment modal
    const [paymentModalInfo, setPaymentModalInfo] = useState<{ isOpen: boolean; stage?: PaymentStage; existingPayment?: SubsidyPaymentModel | null }>({ isOpen: false });
    
    // Fetch all available resources for the distribution form dropdown
    const allResources = useQuery(useMemo(() => database.get<ResourceModel>('resources').query(Q.sortBy('name', Q.asc)), [database]));
    const resourceMap = useMemo(() => new Map(allResources.map(r => [r.id, r])), [allResources]);

    // State for voice notes
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);


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
                const { id, createdAt, createdBy, farmerId, applicationId, asoId, ...updatableData } = updatedFarmerData;
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
            case ActivityType.PAYMENT_RECORDED:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134 0V7.418zM12.5 8.5h-5a2.5 2.5 0 000 5h5a2.5 2.5 0 000-5zM11 10a1 1 0 11-2 0 1 1 0 012 0z" /><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8 6a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>;
            case ActivityType.RESOURCE_DISTRIBUTED:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
            case ActivityType.VOICE_NOTE:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>;
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
                     <p className="text-gray-500 font-mono">{farmer.farmerId}</p>
                </div>

                <div className="mt-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-4">
                            <TabButton tab="profile" label="Profile" />
                            <TabButton tab="subsidy" label="Subsidy Eligibility" />
                            <TabButton tab="land" label="Land & Plantation" />
                            <TabButton tab="bank" label="Bank Details" />
                            <TabButton tab="payments" label="Payment History" />
                            <TabButton tab="resources" label="Resources" />
                            <TabButton tab="timeline" label="Timeline" />
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
                                onDelete={(plot) => alert(`Deletion for plot ${plot.id} is not yet implemented.`)}
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
                    />
                </React.Suspense>
            )}
            {plotFormState.isOpen && (
                <PlotFormModal
                    onClose={() => setPlotFormState({ isOpen: false })}
                    plot={plotFormState.plot}
                />
            )}
            {isLiveAssistantOpen && (
                <React.Suspense fallback={<div />}>
                    <LiveAssistantModal
                        farmer={farmerModelToPlain(farmer)!}
                        onClose={() => setIsLiveAssistantOpen(false)}
                    />
                </React.Suspense>
            )}
            <button
                onClick={() => setIsLiveAssistantOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 z-30"
                title="Open Live AI Assistant"
                aria-label="Open Live AI Assistant"
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
    const [resourceDistributions, setResourceDistributions] = useState<ResourceDistributionModel[]>([]);


    useEffect(() => {
        if (farmer) {
            const sub1 = farmer.subsidyPayments.observe().subscribe(setSubsidyPayments);
            const sub2 = farmer.activityLogs.observe().subscribe(setActivityLogs);
            const sub3 = farmer.resourceDistributions.observe().subscribe(setResourceDistributions);
            return () => {
                sub1.unsubscribe();
                sub2.unsubscribe();
                sub3.unsubscribe();
            };
        }
    }, [farmer]);
    
    // The component will re-render when `farmer` changes. If it becomes undefined (e.g., user navigated to a farmer they can't see),
    // `InnerFarmerDetailsPage` will correctly show the "not found" message.
    return <InnerFarmerDetailsPage farmer={farmer!} subsidyPayments={subsidyPayments} activityLogs={activityLogs} resourceDistributions={resourceDistributions} {...rest} />;
});


export default EnhancedFarmerDetailsPage;
