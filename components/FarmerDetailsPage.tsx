import React, { useState, useEffect, useMemo, useCallback, lazy } from 'react';
import { Database } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { FarmerModel, SubsidyPaymentModel } from '../db';
import { User, Permission, FarmerStatus, SubsidyPayment, Farmer } from '../types';
import { GEO_DATA } from '../data/geoData';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import AiReviewModal from './AiReviewModal';
import ConfirmationModal from './ConfirmationModal';

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

const modelToPlain = (f: FarmerModel | null): Farmer | null => {
    if (!f) return null;
    return {
        id: f.id,
        fullName: f.fullName,
        fatherHusbandName: f.fatherHusbandName,
        aadhaarNumber: f.aadhaarNumber,
        mobileNumber: f.mobileNumber,
        gender: f.gender,
        address: f.address,
        ppbRofrId: f.ppbRofrId,
        photo: f.photo,
        bankAccountNumber: f.bankAccountNumber,
        ifscCode: f.ifscCode,
        accountVerified: f.accountVerified,
        appliedExtent: f.appliedExtent,
        approvedExtent: f.approvedExtent,
        numberOfPlants: f.numberOfPlants,
        methodOfPlantation: f.methodOfPlantation,
        plantType: f.plantType,
        plantationDate: f.plantationDate,
        mlrdPlants: f.mlrdPlants,
        fullCostPlants: f.fullCostPlants,
        latitude: f.latitude,
        longitude: f.longitude,
        applicationId: f.applicationId,
        farmerId: f.farmerId,
        proposedYear: f.proposedYear,
        registrationDate: f.registrationDate,
        asoId: f.asoId,
        paymentUtrDd: f.paymentUtrDd,
        status: f.status,
        district: f.district,
        mandal: f.mandal,
        village: f.village,
        syncStatus: f.syncStatusLocal,
        createdBy: f.createdBy,
        updatedBy: f.updatedBy,
        createdAt: new Date(f.createdAt).toISOString(),
        updatedAt: new Date(f.updatedAt).toISOString(),
    };
};


const getGeoName = (type: 'district' | 'mandal' | 'village', codes: { district: string; mandal?: string; village?: string }) => {
    try {
        const district = GEO_DATA.find(d => d.code === codes.district);
        if (!district) return codes.district || 'N/A';
        if (type === 'district') return district.name;

        if (!codes.mandal) return 'N/A';
        const mandal = district.mandals.find(m => m.code === codes.mandal);
        if (!mandal) return codes.mandal || 'N/A';
        if (type === 'mandal') return mandal.name;
        
        if (!codes.village) return 'N/A';
        const village = mandal.villages.find(v => v.code === codes.village);
        if (!village) return codes.village || 'N/A';
        if (type === 'village') return village.name;
    } catch (e) {
        console.error("Error getting geo name:", e);
        return 'N/A';
    }
    return codes[type] || 'N/A';
};

const DetailItem: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value || 'N/A'}</dd>
    </div>
);

const InnerFarmerDetailsPage: React.FC<{ farmer: FarmerModel; subsidyPayments: SubsidyPaymentModel[] } & Omit<FarmerDetailsPageProps, 'farmerId' | 'database'>> = ({
    farmer,
    subsidyPayments,
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

        await farmer.database.write(async () => {
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
    }, [farmer, currentUser.id, setNotification]);


    const handleSavePayment = useCallback(async (paymentData: Omit<SubsidyPayment, 'syncStatus' | 'createdAt' | 'createdBy' | 'farmerId'>) => {
        const paymentsCollection = farmer.database.get<SubsidyPaymentModel>('subsidy_payments');
        
        if (paymentData.id && editingPayment) { // This is an update
            await farmer.database.write(async () => {
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
            await farmer.database.write(async () => {
                await paymentsCollection.create(rec => {
                    rec.farmerId = farmer.id;
                    rec.paymentDate = paymentData.paymentDate;
                    rec.amount = paymentData.amount;
                    rec.utrNumber = paymentData.utrNumber;
                    rec.paymentStage = paymentData.paymentStage;
                    rec.notes = paymentData.notes;
                    rec.createdBy = currentUser.id;
                    rec.syncStatusLocal = 'pending';
                });
            });
            setNotification({ message: 'Payment recorded successfully.', type: 'success' });
            setShowPaymentModal(false);
        }
    }, [farmer, currentUser.id, setNotification, editingPayment]);

    const handleDeletePayment = (payment: SubsidyPaymentModel) => {
        setPaymentToDelete(payment);
    };

    const handleConfirmDeletePayment = async () => {
        if (paymentToDelete) {
            await farmer.database.write(async () => {
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
                        existingFarmer={modelToPlain(farmer)}
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

    useEffect(() => {
        if (farmer) {
            const subscription = farmer.subsidyPayments.observe().subscribe(setSubsidyPayments);
            return () => subscription.unsubscribe();
        }
    }, [farmer]);
    
    if (!farmer) {
      return <div>Loading farmer...</div>;
    }

    return <InnerFarmerDetailsPage farmer={farmer} subsidyPayments={subsidyPayments} {...rest} />;
});


export default EnhancedFarmerDetailsPage;