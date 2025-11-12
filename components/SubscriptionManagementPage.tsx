import React, { useState } from 'react';
import { User, Tenant } from '../types';
import { PRICING_MODEL } from '../data/subscriptionPlans';
import ConfirmationModal from './ConfirmationModal';
import { useDatabase } from '../DatabaseContext';
import { TenantModel } from '../db';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';

interface SubscriptionManagementPageProps {
    currentUser: User;
    onBack: () => void;
}

const SubscriptionManagementPage: React.FC<SubscriptionManagementPageProps> = ({ currentUser, onBack }) => {
    const database = useDatabase();
    const tenantResult = useQuery(React.useMemo(() => database.get<TenantModel>('tenants').query(Q.where('id', currentUser.tenantId)), [database, currentUser.tenantId]));
    const tenant = tenantResult.length > 0 ? tenantResult[0] : null;

    const [showCancelModal, setShowCancelModal] = useState(false);

    const handleCancelSubscription = async () => {
        if (tenant) {
            await database.write(async () => {
                await tenant.update(t => {
                    t.subscriptionStatus = 'inactive';
                });
            });
            alert('Your subscription has been cancelled.');
        }
        setShowCancelModal(false);
    };

    return (
        <>
            <div className="p-6 bg-gray-50 min-h-full">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Subscription Management</h1>
                            <p className="text-gray-500">Manage your plan and payment details.</p>
                        </div>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column: Plan Details */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Current Plan Card */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Current Plan</h2>
                                <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div>
                                        <p className="text-lg font-semibold text-green-800">Usage-Based Plan</p>
                                        <p className="text-sm text-green-600">Pay-as-you-go</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-700 capitalize">{tenant?.subscriptionStatus || '...'}</p>
                                </div>
                                <div className="mt-4 text-sm text-gray-600">
                                    <p>Your subscription renews automatically. You are billed monthly based on the number of active users and total farmer records in your account.</p>
                                </div>
                            </div>
                            
                            {/* Payment Method Card */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Method</h2>
                                <div className="flex items-center gap-4">
                                    <img src="https://js.wdd.io/img/visa_mastercard.png" alt="Visa Mastercard" className="h-8"/>
                                    <div>
                                        <p className="font-semibold text-gray-700">Visa ending in 1234</p>
                                        <p className="text-sm text-gray-500">Expires 12/2026</p>
                                    </div>
                                </div>
                                <button className="mt-4 w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold text-sm">Update Payment Method</button>
                            </div>

                            {/* Danger Zone Card */}
                            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
                                <h2 className="text-xl font-bold text-red-700 mb-2">Danger Zone</h2>
                                <p className="text-sm text-gray-600 mb-4">Cancelling your subscription will result in the loss of access to premium features at the end of your billing period. Your data will be retained for 30 days before being permanently deleted.</p>
                                <button 
                                    onClick={() => setShowCancelModal(true)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold text-sm"
                                    disabled={tenant?.subscriptionStatus === 'inactive'}
                                >
                                    Cancel Subscription
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Pricing Details */}
                        <div className="bg-white rounded-lg shadow-md p-6 h-fit">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Pricing Details</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-600">Per User</span>
                                    <span className="font-bold text-gray-800">₹{PRICING_MODEL.PER_USER_COST_INR} / month</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-600">Per Record</span>
                                    <span className="font-bold text-gray-800">₹{PRICING_MODEL.PER_RECORD_COST_INR} / month</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t">
                                <h4 className="font-semibold text-gray-700 mb-3">All Features Included:</h4>
                                <ul className="space-y-2">
                                    {PRICING_MODEL.FEATURES.map(feature => (
                                        <li key={feature} className="flex items-start text-sm">
                                            <svg className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            <span className="text-gray-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showCancelModal && (
                <ConfirmationModal
                    isOpen={showCancelModal}
                    title="Cancel Subscription?"
                    message="Are you sure you want to cancel your subscription? This action cannot be undone."
                    onConfirm={handleCancelSubscription}
                    onCancel={() => setShowCancelModal(false)}
                    confirmText="Yes, Cancel"
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            )}
        </>
    );
};

export default SubscriptionManagementPage;