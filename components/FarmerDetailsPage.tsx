import React, { useState, useEffect, useMemo, useCallback, lazy } from 'react';
import { Database } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { FarmerModel, SubsidyPaymentModel, ActivityLogModel } from '../db';
import { User, Permission, FarmerStatus, SubsidyPayment, Farmer, ActivityType } from '../types';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import AiReviewModal from './AiReviewModal';
import ConfirmationModal from './ConfirmationModal';
import { farmerModelToPlain, getGeoName } from '../lib/utils';
import { useDatabase } from '../DatabaseContext';

const RegistrationForm = lazy(() => import('./RegistrationForm'));

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

const InnerFarmerDetailsPage: React.FC<{ farmer: FarmerModel; subsidyPayments: SubsidyPaymentModel[], activityLogs: ActivityLogModel[] } & Omit<FarmerDetailsPageProps, 'farmerId' | 'database'>> = ({
    farmer,
    subsidyPayments,
    activityLogs,
    users,
    currentUser,
    onBack,
    permissions,
    setNotification
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<SubsidyPaymentModel | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<SubsidyPaymentModel | null>(null);
    const database = useDatabase();

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


    const handleSavePayment = useCallback(async (paymentData: Omit<SubsidyPayment, 'syncStatus' | 'createdAt' | 'createdBy' | 'farmerId'>) => {
        const paymentsCollection = database.get<SubsidyPaymentModel>('subsidy_payments');
        
        if (paymentData.id && editingPayment) { // This is an update
            await database.write(async () => {
                await editingPayment.update(rec => {
                    rec.paymentDate = paymentData.paymentDate;
                    rec.amount = paymentData.amount;
                    rec.utrNumber = paymentData.utrNumber;
                    rec.paymentStage = paymentData.paymentStage;
                    rec.notes = paymentData.notes;
                    rec.syncStatusLocal = 'pending';
                });
            });
            setNotification({ message: 'Payment updated successfully.', type: 'success' });
            setEditingPayment(null);
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
                }, writer);

                const activityLogsCollection = database.get<ActivityLogModel>('activity_logs');
                await activityLogsCollection.create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.PAYMENT_RECORDED;
                    log.description = `${paymentData.paymentStage} of ₹${paymentData.amount.toLocaleString()} recorded.`;
                    log.createdBy = currentUser.id;
                }, writer);
            });
            setNotification({ message: 'Payment recorded successfully.', type: 'success' });
            setShowPaymentModal(false);
        }
    }, [database, farmer, currentUser.id, setNotification, editingPayment]);

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

    const getUserName = (userId?: string) => users.find(u => u.id === userId)?.name || 'System';
    const canEdit = permissions.has(Permission.CAN_EDIT_FARMER);

    if (!farmer) return <div className="text-center p-10">Farmer not found.</div>;

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
            default:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
        }
    };

    return (
        <div className="bg-gray-50 min-h-full p-6">
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
                            <TabButton tab="land" label="Land & Plantation" />
                            <TabButton tab="bank" label="Bank Details" />
                            <TabButton tab="payments" label="Subsidy Payments" />
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
                        {activeTab === 'land' && (
                            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                <DetailItem label="Applied Extent (Acres)" value={farmer.appliedExtent} />
                                <DetailItem label="Approved Extent (Acres)" value={farmer.approvedExtent} />
                                <DetailItem label="Number of Plants" value={farmer.numberOfPlants} />
                                <DetailItem label="Plantation Method" value={farmer.methodOfPlantation} />
                                <DetailItem label="Plant Type" value={farmer.plantType} />
                                <DetailItem label="Plantation Date" value={farmer.plantationDate ? new Date(farmer.plantationDate).toLocaleDateString() : 'N/A'} />
                                <DetailItem label="Latitude" value={farmer.latitude} />
                                <DetailItem label="Longitude" value={farmer.longitude} />
                                {farmer.latitude && farmer.longitude && (
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <a href={`https://www.google.com/maps?q=${farmer.latitude},${farmer.longitude}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-green-600 hover:underline">
                                            View on Map
                                        </a>
                                    </div>
                                )}
                            </dl>
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
                                    {canEdit && <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Record New Payment</button>}
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
                                                    <button onClick={() => setEditingPayment(p)} className="text-green-600 hover:text-green-900 font-medium">Edit</button>
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
                        {activeTab === 'timeline' && (
                             <div>
                                <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
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
            {(showPaymentModal || editingPayment) && (
                <SubsidyPaymentForm
                    onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
                    onSubmit={handleSavePayment}
                    existingPayment={editingPayment}
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
                    />
                </React.Suspense>
            )}
        </div>
    );
};

const enhance = withObservables(['farmerId'], ({ farmerId, database }: { farmerId: string, database: Database }) => ({
    farmer: database.get<FarmerModel>('farmers').findAndObserve(farmerId),
}));

const EnhancedFarmerDetailsPage = enhance(props => {
    const { farmer, ...rest } = props;
    const [subsidyPayments, setSubsidyPayments] = useState<SubsidyPaymentModel[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLogModel[]>([]);

    useEffect(() => {
        if (farmer) {
            const sub1 = farmer.subsidyPayments.observe().subscribe(setSubsidyPayments);
            const sub2 = farmer.activityLogs.observe().subscribe(setActivityLogs);
            return () => {
                sub1.unsubscribe();
                sub2.unsubscribe();
            };
        }
    }, [farmer]);
    
    if (!farmer) {
      return <div>Loading farmer...</div>;
    }

    return <InnerFarmerDetailsPage farmer={farmer} subsidyPayments={subsidyPayments} activityLogs={activityLogs} {...rest} />;
});


export default EnhancedFarmerDetailsPage;