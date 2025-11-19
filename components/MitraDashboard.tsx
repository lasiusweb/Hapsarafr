
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { DealerModel, DealerInventorySignalModel, KhataRecordModel, OrderModel, FarmerModel, ProductModel, OrderItemModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, DealerProfile, KhataRecord } from '../types';
import { formatCurrency, getGeoName, farmerModelToPlain } from '../lib/utils';

interface MitraDashboardProps {
    onBack: () => void;
    currentUser: User;
}

// --- Sub-components ---

const InventorySignalToggle: React.FC<{ product: ProductModel; signal?: DealerInventorySignalModel; onToggle: () => void }> = ({ product, signal, onToggle }) => {
    const isAvailable = signal?.isAvailable || false;
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
            <div>
                <h4 className="font-bold text-gray-800">{product.name}</h4>
                <p className="text-xs text-gray-500">{product.type || 'General Input'}</p>
            </div>
            <button 
                onClick={onToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${isAvailable ? 'bg-green-600' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
        </div>
    );
};

const OrderCard: React.FC<{ order: OrderModel; farmer?: FarmerModel; items: any[]; onStatusChange: (status: string) => void }> = ({ order, farmer, items, onStatusChange }) => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-lg text-gray-800">{farmer?.fullName || 'Unknown Farmer'}</h4>
                    <p className="text-xs text-gray-500">{getGeoName('village', farmerModelToPlain(farmer)!)}</p>
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">{order.status}</span>
            </div>
            <div className="space-y-1 mb-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-700">
                        <span>{item.productName} (x{item.quantity})</span>
                        <span>{formatCurrency(item.quantity * item.pricePerUnit)}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center border-t pt-3">
                <span className="font-bold text-lg">{formatCurrency(total)}</span>
                {order.status === 'Pending' && (
                    <div className="flex gap-2">
                        <button onClick={() => onStatusChange('Cancelled')} className="px-3 py-1 text-red-600 font-semibold text-sm hover:bg-red-50 rounded">Reject</button>
                        <button onClick={() => onStatusChange('Confirmed')} className="px-4 py-1 bg-green-600 text-white font-semibold text-sm rounded hover:bg-green-700">Accept</button>
                    </div>
                )}
                {order.status === 'Confirmed' && (
                     <button onClick={() => onStatusChange('Delivered')} className="px-4 py-1 bg-blue-600 text-white font-semibold text-sm rounded hover:bg-blue-700">Mark Delivered</button>
                )}
            </div>
        </div>
    );
};

const KhataEntryForm: React.FC<{ farmers: FarmerModel[]; onSave: (data: any) => void }> = ({ farmers, onSave }) => {
    const [farmerId, setFarmerId] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmerId || !amount) return;
        onSave({ farmerId, amount: parseFloat(amount), type, description });
        setAmount('');
        setDescription('');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h3 className="font-bold text-gray-800 mb-3">New Entry</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <button type="button" onClick={() => setType('CREDIT')} className={`p-2 rounded text-center font-bold ${type === 'CREDIT' ? 'bg-red-100 text-red-800 ring-2 ring-red-500' : 'bg-gray-100 text-gray-600'}`}>Gave Credit (Udhaar)</button>
                <button type="button" onClick={() => setType('PAYMENT')} className={`p-2 rounded text-center font-bold ${type === 'PAYMENT' ? 'bg-green-100 text-green-800 ring-2 ring-green-500' : 'bg-gray-100 text-gray-600'}`}>Got Payment (Jama)</button>
            </div>
            <select value={farmerId} onChange={e => setFarmerId(e.target.value)} className="w-full p-2 border rounded mb-3" required>
                <option value="">Select Customer</option>
                {farmers.map(f => <option key={f.id} value={f.id}>{f.fullName} ({f.mobileNumber})</option>)}
            </select>
            <div className="flex gap-3 mb-3">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ₹" className="w-1/3 p-2 border rounded" required />
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Item / Note" className="w-2/3 p-2 border rounded" />
            </div>
            <button type="submit" className="w-full bg-gray-800 text-white py-3 rounded font-bold hover:bg-gray-900">Record Entry</button>
        </form>
    );
};


const MitraDashboard: React.FC<MitraDashboardProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState<'signals' | 'orders' | 'khata'>('orders');
    const [dealerProfile, setDealerProfile] = useState<DealerModel | null>(null);
    
    // Fetch Dealer Profile
    useEffect(() => {
        const fetchDealer = async () => {
            const dealers = await database.get<DealerModel>('dealers').query(Q.where('user_id', currentUser.id)).fetch();
            if (dealers.length > 0) {
                setDealerProfile(dealers[0]);
            } else {
                // Auto-create dealer profile for MVP if not exists
                await database.write(async () => {
                    const newDealer = await database.get<DealerModel>('dealers').create(d => {
                        d.userId = currentUser.id;
                        d.shopName = `${currentUser.name}'s Shop`;
                        d.address = 'Local Market';
                        d.mandal = 'Unknown';
                        d.district = 'Unknown';
                        d.isVerified = true;
                        d.tenantId = currentUser.tenantId;
                    });
                    setDealerProfile(newDealer);
                });
            }
        };
        fetchDealer();
    }, [currentUser, database]);

    // Queries
    const products = useQuery(useMemo(() => database.get<ProductModel>('products').query(), [database]));
    
    const signals = useQuery(useMemo(() => 
        dealerProfile ? database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(Q.where('dealer_id', dealerProfile.id)) : database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(Q.where('id', 'null')),
    [database, dealerProfile]));

    const orders = useQuery(useMemo(() => 
        dealerProfile ? database.get<OrderModel>('orders').query(Q.where('dealer_id', dealerProfile.id), Q.sortBy('created_at', 'desc')) : database.get<OrderModel>('orders').query(Q.where('id', 'null')),
    [database, dealerProfile]));
    
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));

    const khataRecords = useQuery(useMemo(() => 
        dealerProfile ? database.get<KhataRecordModel>('khata_records').query(Q.where('dealer_id', dealerProfile.id), Q.sortBy('created_at', 'desc')) : database.get<KhataRecordModel>('khata_records').query(Q.where('id', 'null')),
    [database, dealerProfile]));

    // Maps
    const signalMap = useMemo(() => new Map(signals.map(s => [s.productId, s])), [signals]);
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);

    // Handlers
    const handleToggleSignal = async (productId: string) => {
        if (!dealerProfile) return;
        const signal = signalMap.get(productId);
        await database.write(async () => {
            if (signal) {
                await signal.update(s => { s.isAvailable = !s.isAvailable; s.updatedAt = new Date().toISOString(); });
            } else {
                await database.get<DealerInventorySignalModel>('dealer_inventory_signals').create(s => {
                    s.dealerId = dealerProfile.id;
                    s.productId = productId;
                    s.isAvailable = true;
                    s.updatedAt = new Date().toISOString();
                });
            }
        });
    };

    const handleOrderStatus = async (order: OrderModel, status: string) => {
        await database.write(async () => {
            await (order as any).update((o: OrderModel) => { o.status = status; o.syncStatus = 'pending'; });
        });
    };

    const handleSaveKhata = async (data: any) => {
        if (!dealerProfile) return;
        await database.write(async () => {
            await database.get<KhataRecordModel>('khata_records').create(k => {
                k.dealerId = dealerProfile.id;
                k.farmerId = data.farmerId;
                k.amount = data.amount;
                k.transactionType = data.type;
                k.description = data.description;
                k.transactionDate = new Date().toISOString();
                k.status = 'VERIFIED'; // Auto-verified for MVP
            });
        });
    };

    return (
        <div className="min-h-screen bg-orange-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-extrabold text-orange-800">Hapsara Mitra</h1>
                    <p className="text-xs text-orange-600">{dealerProfile?.shopName}</p>
                </div>
                <button onClick={onBack} className="text-sm font-semibold text-gray-500">Exit</button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b border-orange-200">
                <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'orders' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}>Orders</button>
                <button onClick={() => setActiveTab('signals')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'signals' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}>Stock</button>
                <button onClick={() => setActiveTab('khata')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'khata' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}>Khata</button>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'signals' && (
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-2">Toggle ON for items you have in stock today. Farmers nearby will see this instantly.</div>
                        {products.map(product => (
                            <InventorySignalToggle 
                                key={product.id} 
                                product={product} 
                                signal={signalMap.get(product.id)} 
                                onToggle={() => handleToggleSignal(product.id)} 
                            />
                        ))}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div>
                        {orders.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">No active orders.</div>
                        ) : (
                            orders.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    farmer={farmerMap.get(order.farmerId)} 
                                    items={[]} // Fetching items inside map is inefficient, ideally pre-fetch. For MVP, omitting details or need a separate query.
                                    onStatusChange={(s) => handleOrderStatus(order, s)}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'khata' && (
                    <div>
                        <KhataEntryForm farmers={farmers} onSave={handleSaveKhata} />
                        <h3 className="font-bold text-gray-800 mb-3">Recent Transactions</h3>
                        <div className="space-y-2">
                            {khataRecords.map(record => {
                                const farmer = farmerMap.get(record.farmerId);
                                const isCredit = record.transactionType === 'CREDIT';
                                return (
                                    <div key={record.id} className="bg-white p-3 rounded border-l-4 border flex justify-between items-center" style={{ borderLeftColor: isCredit ? '#ef4444' : '#22c55e' }}>
                                        <div>
                                            <p className="font-bold text-gray-800">{farmer?.fullName}</p>
                                            <p className="text-xs text-gray-500">{record.description} • {new Date(record.transactionDate).toLocaleDateString()}</p>
                                        </div>
                                        <p className={`font-bold ${isCredit ? 'text-red-600' : 'text-green-600'}`}>
                                            {isCredit ? '+' : '-'}{formatCurrency(record.amount)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MitraDashboard;
