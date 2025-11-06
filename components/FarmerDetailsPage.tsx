import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Database } from '@nozbe/watermelondb';
import withObservables from '@nozbe/with-observables';
import { FarmerModel, SubsidyPaymentModel } from '../db';
import { User, Permission, FarmerStatus, SubsidyPayment, Farmer } from '../types';
import { GEO_DATA } from '../data/geoData';
import SubsidyPaymentForm from './SubsidyPaymentForm';
import AiReviewModal from './AiReviewModal';
import ConfirmationModal from './ConfirmationModal';

interface FarmerDetailsPageProps {
    farmerId: string;
    database: Database;
    users: User[];
    currentUser: User;
    onBack: () => void;
    permissions: Set<Permission>;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

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
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<FarmerModel>>({});
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAiReview, setShowAiReview] = useState(false);
    const [editingPayment, setEditingPayment] = useState<SubsidyPaymentModel | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<SubsidyPaymentModel | null>(null);

    useEffect(() => {
        if (farmer && !isEditing) {
            setEditedData({
                fullName: farmer.fullName,
                fatherHusbandName: farmer.fatherHusbandName,
                mobileNumber: farmer.mobileNumber,
                address: farmer.address,
                status: farmer.status,
                latitude: farmer.latitude,
                longitude: farmer.longitude
            });
        }
    }, [farmer, isEditing]);

    const handleSave = async () => {
        await farmer.database.write(async () => {
            await farmer.update(record => {
                Object.assign(record, { ...editedData, syncStatusLocal: 'pending', updatedBy: currentUser.id });
            });
        });
        setIsEditing(false);
        setNotification({ message: 'Farmer details updated.', type: 'success' });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedData({});
    };

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


    const dataForAiReview: Partial<Farmer> = useMemo(() => {
        if (!farmer) return {};
        // Create a plain object combining original and edited data for the AI review
        return {
            ...farmer, // Spread the model; its getters will provide the values
            ...editedData, // Overwrite with any pending edits
        };
    }, [farmer, editedData]);

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
                    {canEdit && (isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold text-sm">Cancel</button>
                            <button
                                type="button"
                                onClick={() => setShowAiReview(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm flex items-center gap-1.5"
                                title="Use AI to check your edits for potential errors."
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                                AI Review
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">Save Changes</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">Edit Farmer</button>
                    ))}
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
                                <DetailItem label="Full Name" value={isEditing ? <input type="text" value={editedData.fullName} onChange={e => setEditedData({...editedData, fullName: e.target.value})} className="w-full p-1 border rounded" /> : farmer.fullName} />
                                <DetailItem label="Father/Husband Name" value={isEditing ? <input type="text" value={editedData.fatherHusbandName} onChange={e => setEditedData({...editedData, fatherHusbandName: e.target.value})} className="w-full p-1 border rounded" /> : farmer.fatherHusbandName} />
                                <DetailItem label="Mobile Number" value={isEditing ? <input type="text" value={editedData.mobileNumber} onChange={e => setEditedData({...editedData, mobileNumber: e.target.value})} className="w-full p-1 border rounded" /> : farmer.mobileNumber} />
                                <DetailItem label="Address" value={isEditing ? <textarea value={editedData.address} onChange={e => setEditedData({...editedData, address: e.target.value})} className="w-full p-1 border rounded" /> : farmer.address} />
                                <DetailItem label="Aadhaar Number" value={`**** **** ${farmer.aadhaarNumber.slice(-4)}`} />
                                <DetailItem label="Gender" value={farmer.gender} />
                                <DetailItem label="Location" value={`${getGeoName('village', { district: farmer.district, mandal: farmer.mandal, village: farmer.village })}, ${getGeoName('mandal', { district: farmer.district, mandal: farmer.mandal })}`} />
                                <DetailItem label="District" value={getGeoName('district', { district: farmer.district })} />
                                <DetailItem label="Status" value={isEditing ? <select value={editedData.status} onChange={e => setEditedData({...editedData, status: e.target.value as FarmerStatus})} className="w-full p-1 border rounded bg-white">{Object.values(FarmerStatus).map(s => <option key={s}>{s}</option>)}</select> : farmer.status} />
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
                                <DetailItem label="Latitude" value={isEditing ? <input type="number" step="any" value={editedData.latitude ?? ''} onChange={e => setEditedData({...editedData, latitude: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-full p-1 border rounded" /> : farmer.latitude} />
                                <DetailItem label="Longitude" value={isEditing ? <input type="number" step="any" value={editedData.longitude ?? ''} onChange={e => setEditedData({...editedData, longitude: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-full p-1 border rounded" /> : farmer.longitude} />
                                {farmer.latitude && farmer.longitude && !isEditing && (
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
            {showAiReview && <AiReviewModal farmerData={dataForAiReview} onClose={() => setShowAiReview(false)} />}
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