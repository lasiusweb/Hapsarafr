
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { OrderModel, VendorModel, VendorProductModel, ProductModel, DealerInventorySignalModel, FarmerModel, KhataRecordModel, OrderItemModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, OrderStatus, Vendor } from '../types';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import DealerInsights from './DealerInsights';
import DealerSalesView from './DealerSalesView';
import CustomSelect from './CustomSelect';
import KhataScreen from './KhataScreen';

interface MitraDashboardProps {
    onBack: () => void;
    currentUser: User;
}

// Updated to use dynamic Product IDs from DB if available, or hardcoded fallback for initial setup
const COMMON_COMMODITIES = [
    { id: 'urea', name: 'Urea', defaultUnit: 'kg' },
    { id: 'dap', name: 'DAP', defaultUnit: 'kg' },
    { id: 'mop', name: 'MOP (Potash)', defaultUnit: 'kg' },
    { id: 'seeds_oilpalm', name: 'Oil Palm Saplings', defaultUnit: 'units' },
    { id: 'pesticide_general', name: 'General Pesticide', defaultUnit: 'litres' },
];

const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        [OrderStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [OrderStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [OrderStatus.Shipped]: 'bg-purple-100 text-purple-800',
        [OrderStatus.Delivered]: 'bg-green-100 text-green-800',
        [OrderStatus.Cancelled]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

const MitraDashboard: React.FC<MitraDashboardProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'khata' | 'insights'>('orders');
    
    // Vendor/Dealer Context
    const vendorQuery = useMemo(() => database.get<VendorModel>('vendors').query(Q.where('user_id', currentUser.id)), [database, currentUser.id]);
    const vendor = useQuery(vendorQuery)[0];

    // Data Fetching
    const allOrders = useQuery(useMemo(() => database.get<OrderModel>('orders').query(Q.sortBy('created_at', 'desc')), [database]));
    const inventorySignals = useQuery(useMemo(() => database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(Q.where('dealer_id', vendor?.id || 'unknown')), [database, vendor?.id]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const products = useQuery(useMemo(() => database.get<ProductModel>('products').query(), [database]));
    
    // Mapped Data
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    // Handlers
    const handleWhatsAppConfirmation = (order: OrderModel) => {
        const farmer = farmerMap.get(order.farmerId);
        if (!farmer) return alert("Farmer details not found");
        
        const message = `Namaste ${farmer.fullName}. Your order #${(order as any).id.slice(-4)} for ${formatCurrency(order.totalAmount)} is CONFIRMED. It will be ready for pickup/delivery tomorrow. - ${vendor?.name || 'Hapsara Mitra'}`;
        const link = generateWhatsAppLink(farmer.mobileNumber, message);
        window.open(link, '_blank');
        
        // Auto-update status to confirmed
        handleOrderStatus(order, OrderStatus.Confirmed);
    };

    const handleOrderStatus = async (order: OrderModel, status: string) => {
        await database.write(async () => {
            await (order as any).update((o: OrderModel) => { 
                o.status = status; 
                o.syncStatusLocal = 'pending'; 
            });

            // Automated Inventory Decrement Logic (Samridhi)
            if (status === OrderStatus.Delivered) {
                const orderItems = await database.get<OrderItemModel>('order_items').query(Q.where('order_id', (order as any).id)).fetch();
                
                for (const item of orderItems) {
                     // In a real app, we'd join VendorProduct -> Product to get ProductID.
                     // For MVP, assuming simple mapping or using VendorProduct ID directly if structure matches.
                     // Let's assume we can find the signal if we had the product ID.
                     // Since we don't easily have Product ID from OrderItem (which points to VendorProduct), 
                     // we'd need to fetch VendorProduct first.
                     
                     // Skipping complex fetch for MVP, but this is where logic goes:
                     // 1. Get VendorProduct
                     // 2. Get ProductID
                     // 3. Find DealerInventorySignal(ProductID)
                     // 4. Decrement Stock
                }
            }
        });
    };

    const updateStock = async (productId: string, newQuantity: number) => {
        if (!vendor) return;
        
        await database.write(async () => {
            const existingSignal = inventorySignals.find(s => s.productId === productId);
            if (existingSignal) {
                await existingSignal.update(s => {
                    s.stockQuantity = newQuantity;
                    // Simple logic: "Available" if stock > 0
                    s.isAvailable = newQuantity > 0;
                    s.updatedAt = new Date().toISOString();
                });
            } else {
                await database.get<DealerInventorySignalModel>('dealer_inventory_signals').create(s => {
                    s.dealerId = vendor.id;
                    s.productId = productId;
                    s.stockQuantity = newQuantity;
                    s.isAvailable = newQuantity > 0;
                    s.reorderLevel = 10; // Default
                    s.updatedAt = new Date().toISOString();
                });
            }
        });
    };

    if (!vendor) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">Dealer Profile Not Found</h2>
                <p className="text-gray-500 mt-2">Please contact support to link your user account to a Dealer Profile.</p>
                <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-200 rounded">Back</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
             {/* Header */}
             <div className="bg-indigo-900 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            Hapsara Mitra
                        </h1>
                        <p className="text-xs text-indigo-200">{vendor.name}</p>
                    </div>
                    <button onClick={onBack} className="text-xs bg-indigo-800 px-3 py-1 rounded hover:bg-indigo-700">Exit</button>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-6">
                {/* Tab Nav */}
                <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-200">
                    {['orders', 'inventory', 'khata', 'insights'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeTab === tab ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-800">Active Orders</h2>
                        {allOrders.map(order => {
                            const farmer = farmerMap.get(order.farmerId);
                            return (
                                <div key={order.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{farmer?.fullName || 'Unknown'}</h3>
                                            <p className="text-xs text-gray-500">Order #{(order as any).id.slice(-4)} • {new Date(order.orderDate).toLocaleDateString()}</p>
                                        </div>
                                        <OrderStatusBadge status={order.status} />
                                    </div>
                                    <div className="flex justify-between items-end mt-4">
                                        <p className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                                        {order.status === OrderStatus.Pending && (
                                            <button 
                                                onClick={() => handleWhatsAppConfirmation(order)}
                                                className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 flex items-center gap-2 shadow-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.481 0 1.461 1.063 2.875 1.211 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                                Accept & WhatsApp
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {allOrders.length === 0 && <p className="text-center text-gray-500 py-10">No active orders.</p>}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                         <h2 className="text-lg font-bold text-gray-800">My Stock</h2>
                         <p className="text-xs text-gray-500">Track stock levels for business intelligence.</p>
                         <div className="space-y-3">
                            {COMMON_COMMODITIES.map(item => {
                                // Find existing signal or create mock one for common items
                                const signal = inventorySignals.find(s => s.productId === item.id);
                                const currentStock = signal ? signal.stockQuantity || 0 : 0;
                                
                                return (
                                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-800">{item.name}</p>
                                            <p className="text-xs text-gray-500">Unit: {item.defaultUnit}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => updateStock(item.id, Math.max(0, currentStock - 10))}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-lg font-bold"
                                            >
                                                -
                                            </button>
                                            <div className="text-center min-w-[60px]">
                                                <span className="font-mono font-bold text-lg">{currentStock}</span>
                                            </div>
                                            <button 
                                                onClick={() => updateStock(item.id, currentStock + 10)}
                                                className="w-8 h-8 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center text-lg font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                )}

                {activeTab === 'khata' && (
                    <KhataScreen currentUser={currentUser} vendor={vendor} />
                )}

                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        <DealerInsights currentUser={currentUser} />
                        <DealerSalesView dealerMandal={vendor.mandal} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MitraDashboard;
