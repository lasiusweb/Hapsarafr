import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, ProtectionProductModel, ProtectionSubscriptionModel, ProtectionClaimModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, Farmer, ProtectionType, ClaimStatus, ActivityType } from '../types';
import CustomSelect from './CustomSelect';
import { formatCurrency } from '../lib/utils';
import { useRiskCalculator } from '../hooks/useRiskCalculator';

interface FamilyShieldProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

// --- Icons ---
const ShieldCheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ShieldExclamationIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
    </svg>
);

// --- Helper Components ---
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        'ACTIVE': 'bg-green-100 text-green-800',
        'EXPIRED': 'bg-gray-100 text-gray-800',
        'CANCELLED': 'bg-red-100 text-red-800',
        'PENDING': 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

const ClaimStatusBadge: React.FC<{ status: ClaimStatus }> = ({ status }) => {
    const colors: Record<string, string> = {
        [ClaimStatus.PAID]: 'bg-green-100 text-green-800',
        [ClaimStatus.APPROVED]: 'bg-blue-100 text-blue-800',
        [ClaimStatus.REJECTED]: 'bg-red-100 text-red-800',
        [ClaimStatus.VERIFYING]: 'bg-purple-100 text-purple-800',
        [ClaimStatus.ANALYZING]: 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

// --- Modals ---
const SubscribeModal: React.FC<{ 
    product: ProtectionProductModel; 
    onClose: () => void; 
    onConfirm: (amount: number) => void; 
}> = ({ product, onClose, onConfirm }) => {
    const [coverageAmount, setCoverageAmount] = useState<number>(product.coverageLimit || 100000);
    
    // Use the new RiskCalculator hook
    const { premium, rateApplied, breakdown } = useRiskCalculator(product, coverageAmount);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Subscribe to Protection</h3>
                    <p className="text-sm text-gray-500">{product.name}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coverage Amount (₹)</label>
                        <input 
                            type="number" 
                            value={coverageAmount} 
                            onChange={e => setCoverageAmount(Number(e.target.value))} 
                            max={product.coverageLimit}
                            className="mt-1 w-full p-2 border rounded-md"
                        />
                        {product.coverageLimit && <p className="text-xs text-gray-500 mt-1">Max limit: {formatCurrency(product.coverageLimit)}</p>}
                    </div>
                    
                    {/* Transparent Pricing Calculation */}
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                            <span className="text-blue-800 font-medium">Estimated Premium</span>
                            <span className="text-xl font-bold text-blue-900">{formatCurrency(premium)}</span>
                        </div>
                        <div className="text-xs text-blue-600 space-y-1 pt-1">
                            <div className="flex justify-between">
                                <span>Effective Rate:</span>
                                <span>{rateApplied}</span>
                            </div>
                            {breakdown.map((item, index) => (
                                <div key={index} className="flex justify-between opacity-80">
                                    <span>{item.label}:</span>
                                    <span>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end gap-3 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={() => onConfirm(premium)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">Confirm & Subscribe</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const FamilyShield: React.FC<FamilyShieldProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'my_protections' | 'catalog' | 'claims'>('my_protections');
    const [selectedProduct, setSelectedProduct] = useState<ProtectionProductModel | null>(null);

    // Data Queries
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);
    
    const products = useQuery(useMemo(() => database.get<ProtectionProductModel>('protection_products').query(), [database]));
    
    const subscriptions = useQuery(useMemo(() => 
        selectedFarmerId ? database.get<ProtectionSubscriptionModel>('protection_subscriptions').query(Q.where('farmer_id', selectedFarmerId)) : database.get<ProtectionSubscriptionModel>('protection_subscriptions').query(Q.where('id', 'null')),
    [database, selectedFarmerId]));
    
    const claims = useQuery(useMemo(() => {
        if (!subscriptions.length) return database.get<ProtectionClaimModel>('protection_claims').query(Q.where('id', 'null'));
        const subIds = subscriptions.map(s => s.id);
        return database.get<ProtectionClaimModel>('protection_claims').query(Q.where('subscription_id', Q.oneOf(subIds)));
    }, [database, subscriptions]));

    // Derived State
    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
    const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'ACTIVE'), [subscriptions]);
    const shieldHealth = useMemo(() => {
        if (!selectedFarmerId) return 'unknown';
        if (activeSubscriptions.length > 1) return 'strong';
        if (activeSubscriptions.length === 1) return 'moderate';
        return 'at_risk';
    }, [selectedFarmerId, activeSubscriptions]);

    // Handlers
    const handleSubscribe = async (premium: number) => {
        if (!selectedProduct || !selectedFarmerId) return;
        
        try {
            await database.write(async () => {
                // Create Subscription
                const sub = await database.get<ProtectionSubscriptionModel>('protection_subscriptions').create(s => {
                    s.farmerId = selectedFarmerId;
                    s.productId = selectedProduct.id;
                    s.startDate = new Date().toISOString();
                    s.endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(); // Default 1 year
                    s.coverageAmount = selectedProduct.coverageLimit || 100000; // Simplified
                    s.premiumPaid = premium;
                    s.status = 'ACTIVE';
                    s.syncStatusLocal = 'pending';
                });

                // Log Activity
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = selectedFarmerId;
                    log.activityType = ActivityType.STATUS_CHANGE; // Reusing general status change
                    log.description = `Subscribed to ${selectedProduct.name}. Premium: ${formatCurrency(premium)}`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Subscription successful!', type: 'success' });
            setSelectedProduct(null);
            setActiveTab('my_protections');
        } catch (e) {
            console.error(e);
            setNotification({ message: 'Failed to subscribe.', type: 'error' });
        }
    };

    const handleFileClaim = async (subscriptionId: string) => {
        if(!window.confirm("Are you sure you want to file a claim for this subscription? This will trigger a verification process.")) return;

        try {
            await database.write(async () => {
                await database.get<ProtectionClaimModel>('protection_claims').create(c => {
                    c.subscriptionId = subscriptionId;
                    c.triggerType = 'MANUAL_REPORT';
                    c.status = ClaimStatus.ANALYZING;
                    c.syncStatusLocal = 'pending';
                });
            });
            setNotification({ message: 'Claim filed successfully.', type: 'success' });
            setActiveTab('claims');
        } catch (e) {
            setNotification({ message: 'Failed to file claim.', type: 'error' });
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-blue-600">FamilyShield</span> Dashboard
                        </h1>
                        <p className="text-gray-500">Integrated Insurance & Risk Protection for Farmer Families.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>

                {/* Selector */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-8">
                    <CustomSelect 
                        label="Select Farmer to View Shield Status" 
                        options={farmerOptions} 
                        value={selectedFarmerId} 
                        onChange={setSelectedFarmerId} 
                        placeholder="-- Choose a farmer --" 
                    />
                </div>

                {selectedFarmerId ? (
                    <div className="space-y-8">
                        {/* Status Hero */}
                        <div className={`rounded-xl shadow-lg p-8 text-white flex items-center justify-between ${
                            shieldHealth === 'strong' ? 'bg-gradient-to-r from-green-500 to-emerald-700' : 
                            shieldHealth === 'moderate' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' : 
                            'bg-gradient-to-r from-red-500 to-pink-700'
                        }`}>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {shieldHealth === 'strong' ? 'Fully Protected' : shieldHealth === 'moderate' ? 'Partially Protected' : 'Coverage At Risk'}
                                </h2>
                                <p className="opacity-90">
                                    {shieldHealth === 'strong' ? 'This farmer has comprehensive coverage.' : shieldHealth === 'moderate' ? 'Consider adding more protection products.' : 'No active protection found. Review catalog immediately.'}
                                </p>
                            </div>
                            <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                                {shieldHealth === 'at_risk' ? <ShieldExclamationIcon className="h-16 w-16 text-white" /> : <ShieldCheckIcon className="h-16 w-16 text-white" />}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                            <div className="flex border-b">
                                <button onClick={() => setActiveTab('my_protections')} className={`flex-1 py-4 font-semibold text-sm border-b-2 ${activeTab === 'my_protections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>My Protections ({activeSubscriptions.length})</button>
                                <button onClick={() => setActiveTab('catalog')} className={`flex-1 py-4 font-semibold text-sm border-b-2 ${activeTab === 'catalog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Product Catalog</button>
                                <button onClick={() => setActiveTab('claims')} className={`flex-1 py-4 font-semibold text-sm border-b-2 ${activeTab === 'claims' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Claims ({claims.length})</button>
                            </div>

                            <div className="p-6 min-h-[400px]">
                                {activeTab === 'my_protections' && (
                                    <div className="space-y-4">
                                        {subscriptions.map(sub => {
                                            const product = productMap.get(sub.productId);
                                            return (
                                                <div key={sub.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">{product?.name || 'Unknown Product'}</h4>
                                                        <p className="text-sm text-gray-500">{product?.type.replace('_', ' ')}</p>
                                                        <p className="text-xs text-gray-400 mt-1">Valid: {new Date(sub.startDate!).toLocaleDateString()} - {new Date(sub.endDate!).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-gray-800">{formatCurrency(sub.coverageAmount || 0)}</p>
                                                        <div className="mt-2"><StatusBadge status={sub.status} /></div>
                                                        {sub.status === 'ACTIVE' && (
                                                            <button onClick={() => handleFileClaim(sub.id)} className="mt-2 text-xs text-red-600 hover:underline font-semibold block w-full text-right">Report Incident</button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {subscriptions.length === 0 && <p className="text-center text-gray-500 py-10">No subscriptions found.</p>}
                                    </div>
                                )}

                                {activeTab === 'catalog' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {products.map(product => (
                                            <div key={product.id} className="border rounded-lg p-6 flex flex-col h-full hover:border-blue-300 transition-colors">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-lg text-gray-800">{product.name}</h4>
                                                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{product.type.replace('_', ' ')}</span>
                                                    </div>
                                                    <div className="text-gray-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-4 flex-grow">Provided by {product.providerName}. Basic coverage for unexpected events.</p>
                                                <div className="border-t pt-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Basis Points</p>
                                                        <p className="font-semibold">{product.premiumBasisPoints} bps</p>
                                                    </div>
                                                    <button onClick={() => setSelectedProduct(product)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">Subscribe</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'claims' && (
                                    <div className="space-y-4">
                                        {claims.map(claim => {
                                            const sub = subscriptions.find(s => s.id === claim.subscriptionId);
                                            const product = sub ? productMap.get(sub.productId) : null;
                                            return (
                                                <div key={claim.id} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-gray-800">{product?.name || 'Unknown Policy'} Claim</h4>
                                                            <p className="text-sm text-gray-500">Filed on {new Date(claim.createdAt).toLocaleDateString()}</p>
                                                            <p className="text-xs text-gray-600 mt-1 font-mono">Trigger: {claim.triggerType}</p>
                                                        </div>
                                                        <ClaimStatusBadge status={claim.status as ClaimStatus} />
                                                    </div>
                                                    {claim.payoutAmount && (
                                                        <div className="mt-3 pt-3 border-t text-right">
                                                            <span className="text-sm text-gray-600 mr-2">Payout Approved:</span>
                                                            <span className="font-bold text-green-600">{formatCurrency(claim.payoutAmount)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {claims.length === 0 && <p className="text-center text-gray-500 py-10">No claims found.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-lg shadow-md">
                         <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 mb-4">
                            <ShieldCheckIcon className="h-10 w-10 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-700">Select a Farmer</h2>
                        <p className="mt-2 text-gray-500">Choose a farmer above to manage their FamilyShield protection plan.</p>
                    </div>
                )}
            </div>

            {selectedProduct && (
                <SubscribeModal 
                    product={selectedProduct} 
                    onClose={() => setSelectedProduct(null)} 
                    onConfirm={handleSubscribe} 
                />
            )}
        </div>
    );
};

export default FamilyShield;