
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { OrderModel, VendorModel, VendorProductModel, ProductModel, DealerInventorySignalModel, FarmerModel, OrderItemModel, WalletModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, OrderStatus } from '../types';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import DealerInsights from './DealerInsights';
import DealerSalesView from './DealerSalesView';
import CustomerSegmentsView from './CustomerSegmentsView';
import ProductBundlingView from './ProductBundlingView';
import CustomSelect from './CustomSelect';
import KhataScreen from './KhataScreen';
import { analyzeMarketBasket, getSalesTrends } from '../lib/businessIntelligence';
import PurchaseCreditsModal from './PurchaseCreditsModal';

interface MitraDashboardProps {
    onBack: () => void;
    currentUser: User;
}

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

const AddProductModal: React.FC<{ 
    onClose: () => void; 
    onSave: (productId: string, price: number, stock: number) => void; 
    availableProducts: ProductModel[];
}> = ({ onClose, onSave, availableProducts }) => {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');

    const productOptions = useMemo(() => availableProducts.map(p => ({ value: p.id, label: p.name })), [availableProducts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProductId && price && stock) {
            onSave(selectedProductId, parseFloat(price), parseInt(stock));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Add Product to Inventory</h2></div>
                <div className="p-8 space-y-4">
                    <CustomSelect 
                        label="Select Product" 
                        options={productOptions} 
                        value={selectedProductId} 
                        onChange={setSelectedProductId} 
                        placeholder="-- Choose from Catalog --"
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Selling Price (₹)</label>
                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border rounded-md mt-1" placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Initial Stock</label>
                        <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full p-2 border rounded-md mt-1" placeholder="0" />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold">Add Product</button>
                </div>
            </div>
        </div>
    );
};

const MitraDashboard: React.FC<MitraDashboardProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'khata' | 'insights'>('orders');
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<string | null>(null); // ID of VendorProduct being edited
    const [editValues, setEditValues] = useState({ price: '', stock: '' });
    const [searchQuery, setSearchQuery] = useState('');

    // Vendor/Dealer Context
    const vendorQuery = useMemo(() => database.get<VendorModel>('vendors').query(Q.where('user_id', currentUser.id)), [database, currentUser.id]);
    const vendor = useQuery(vendorQuery)[0];

    // Wallet Context
    const walletQuery = useMemo(() => vendor ? database.get<WalletModel>('wallets').query(Q.where('vendor_id', vendor.id)) : database.get<WalletModel>('wallets').query(Q.where('id', 'null')), [database, vendor]);
    const vendorWallet = useQuery(walletQuery)[0];

    // Optimized Data Fetching
    const myOrders = useQuery(useMemo(() => {
        if (!vendor) return database.get<OrderModel>('orders').query(Q.where('id', 'null'));
        return database.get<OrderModel>('orders').query(
            Q.where('dealer_id', vendor.id), 
            Q.sortBy('order_date', 'desc')
        );
    }, [database, vendor]));

    const orderIds = useMemo(() => myOrders.map(o => o.id), [myOrders]);
    const myOrderItems = useQuery(useMemo(() => {
        if (orderIds.length === 0) return database.get<OrderItemModel>('order_items').query(Q.where('id', 'null'));
        return database.get<OrderItemModel>('order_items').query(Q.where('order_id', Q.oneOf(orderIds)));
    }, [database, orderIds]));

    // Inventory Data - Optimized Query
    const myVendorProducts = useQuery(useMemo(() => {
        if (!vendor) return database.get<VendorProductModel>('vendor_products').query(Q.where('id', 'null'));
        return database.get<VendorProductModel>('vendor_products').query(Q.where('vendor_id', vendor.id));
    }, [database, vendor]));

    const products = useQuery(useMemo(() => database.get<ProductModel>('products').query(), [database]));
    const allVendorProducts = useQuery(useMemo(() => database.get<VendorProductModel>('vendor_products').query(), [database])); // Needed for global trends comparison
    const inventorySignals = useQuery(useMemo(() => database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(Q.where('dealer_id', vendor?.id || 'unknown')), [database, vendor?.id]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    // Filter products not yet in inventory for "Add" modal
    const availableToAdd = useMemo(() => {
        const myProductIds = new Set(myVendorProducts.map(vp => vp.productId));
        return products.filter(p => !myProductIds.has(p.id));
    }, [products, myVendorProducts]);

    // Sales Trends (BI)
    const salesTrends = useMemo(() => {
        if (!vendor) return [];
        return getSalesTrends(myOrders, myOrderItems, allVendorProducts, vendor.id);
    }, [myOrders, myOrderItems, allVendorProducts, vendor]);

    // Market Basket Analysis
    const bundles = useMemo(() => {
        if (myOrders.length === 0 || products.length === 0) return [];
        return analyzeMarketBasket(myOrders, myOrderItems, allVendorProducts, products);
    }, [myOrders, myOrderItems, allVendorProducts, products]);


    // Handlers
    const handleWhatsAppConfirmation = (order: OrderModel) => {
        const farmer = farmerMap.get(order.farmerId);
        if (!farmer) return alert("Farmer details not found");
        
        const message = `Namaste ${farmer.fullName}. Your order #${(order as any).id.slice(-4)} for ${formatCurrency(order.totalAmount)} is CONFIRMED. It will be ready for pickup/delivery tomorrow. - ${vendor?.name || 'Hapsara Mitra'}`;
        const link = generateWhatsAppLink(farmer.mobileNumber, message);
        window.open(link, '_blank');
        
        handleOrderStatus(order, OrderStatus.Confirmed);
    };

    const handleOrderStatus = async (order: OrderModel, status: string) => {
        await database.write(async () => {
            await (order as any).update((o: OrderModel) => { 
                o.status = status; 
                o.syncStatusLocal = 'pending'; 
            });

            if (status === OrderStatus.Delivered) {
                const orderItems = myOrderItems.filter(item => item.orderId === (order as any).id);
                for (const item of orderItems) {
                    const vp = myVendorProducts.find(v => v.id === item.vendorProductId);
                    if (vp) {
                        // 1. Update Actual Stock
                        const newQty = Math.max(0, vp.stockQuantity - item.quantity);
                        await vp.update(v => { v.stockQuantity = newQty; });
                        
                        // 2. Update BI Signal
                        const signal = inventorySignals.find(s => s.productId === vp.productId);
                        if (signal) {
                            await signal.update(s => {
                                s.stockQuantity = newQty;
                                s.isAvailable = newQty > 0;
                                s.updatedAt = new Date().toISOString();
                            });
                        }
                    }
                }
            }
        });
    };

    const handleAddProduct = async (productId: string, price: number, stock: number) => {
        if (!vendor) return;
        await database.write(async () => {
            // 1. Create VendorProduct (Commercial Record)
            await database.get<VendorProductModel>('vendor_products').create(vp => {
                vp.vendorId = vendor.id;
                vp.productId = productId;
                vp.price = price;
                vp.stockQuantity = stock;
                vp.unit = 'units'; // Default, can be refined from product
            });

            // 2. Create/Update Inventory Signal for BI (Intelligence Record)
            // Ground Reality: The AI engine runs on 'DealerInventorySignal', not 'VendorProduct'
            // to abstract away pricing and focus on availability.
            const existingSignal = inventorySignals.find(s => s.productId === productId);
            if (existingSignal) {
                await existingSignal.update(s => {
                    s.stockQuantity = stock;
                    s.isAvailable = stock > 0;
                    s.updatedAt = new Date().toISOString();
                });
            } else {
                await database.get<DealerInventorySignalModel>('dealer_inventory_signals').create(s => {
                    s.dealerId = vendor.id;
                    s.productId = productId;
                    s.stockQuantity = stock;
                    s.isAvailable = stock > 0;
                    s.reorderLevel = 10;
                    s.updatedAt = new Date().toISOString();
                });
            }
        });
        setIsAddProductModalOpen(false);
    };

    const handleUpdateProduct = async (vp: VendorProductModel) => {
        const newPrice = parseFloat(editValues.price);
        const newStock = parseInt(editValues.stock);
        
        if (isNaN(newPrice) || isNaN(newStock)) return;

        await database.write(async () => {
            // 1. Update VendorProduct
            await (vp as any).update((v: VendorProductModel) => {
                v.price = newPrice;
                v.stockQuantity = newStock;
            });

            // 2. Update Signal (Atomic update for BI consistency)
            const signal = inventorySignals.find(s => s.productId === vp.productId);
            if (signal) {
                await signal.update(s => {
                    s.stockQuantity = newStock;
                    s.isAvailable = newStock > 0;
                    s.updatedAt = new Date().toISOString();
                });
            } else if (vendor) {
                 // If signal missing for some reason, create it
                await database.get<DealerInventorySignalModel>('dealer_inventory_signals').create(s => {
                    s.dealerId = vendor.id;
                    s.productId = vp.productId;
                    s.stockQuantity = newStock;
                    s.isAvailable = newStock > 0;
                    s.reorderLevel = 10;
                    s.updatedAt = new Date().toISOString();
                });
            }
        });
        setEditingProduct(null);
    };

    const startEditing = (vp: VendorProductModel) => {
        setEditingProduct((vp as any).id);
        setEditValues({ price: String(vp.price), stock: String(vp.stockQuantity) });
    };

    const handleVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice search not supported in this browser.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSearchQuery(transcript);
        };
        recognition.start();
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

    const filteredInventory = useMemo(() => {
        if (!searchQuery) return myVendorProducts;
        return myVendorProducts.filter(vp => {
            const product = productMap.get(vp.productId);
            return product?.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [myVendorProducts, searchQuery, productMap]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
             {/* Header */}
             <div className="bg-indigo-900 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                Hapsara Mitra
                            </h1>
                            <p className="text-xs text-indigo-200">{vendor.name}</p>
                        </div>
                        <button onClick={onBack} className="text-xs bg-indigo-800 px-3 py-1 rounded hover:bg-indigo-700">Exit</button>
                    </div>
                    
                    <div className="bg-indigo-800/50 p-3 rounded-lg flex justify-between items-center">
                        <div className="flex flex-col">
                             <span className="text-xs text-indigo-200 uppercase font-semibold">My Wallet Balance</span>
                             <span className="text-xl font-bold font-mono">{formatCurrency(vendorWallet?.balance || 0)}</span>
                        </div>
                        <button 
                            onClick={() => setIsTopUpModalOpen(true)}
                            className="px-3 py-1.5 bg-white text-indigo-900 text-xs font-bold rounded shadow-sm hover:bg-indigo-50 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                            Add Credits
                        </button>
                    </div>
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
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search orders..." 
                                className="flex-1 p-2 border rounded-lg text-sm"
                            />
                            <button onClick={handleVoiceSearch} className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300">
                                🎤
                            </button>
                        </div>

                        <h2 className="text-lg font-bold text-gray-800">Active Orders</h2>
                        {myOrders.map(order => {
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
                                        
                                        <div className="flex gap-2">
                                            {order.status === OrderStatus.Pending && (
                                                <button 
                                                    onClick={() => handleWhatsAppConfirmation(order)}
                                                    className="px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 flex items-center gap-1 shadow-sm"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.481 0 1.461 1.063 2.875 1.211 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                                    Confirm
                                                </button>
                                            )}
                                            {order.status === OrderStatus.Shipped && (
                                                 <button 
                                                    onClick={() => handleOrderStatus(order, OrderStatus.Delivered)}
                                                    className="px-3 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 shadow-sm"
                                                >
                                                    Mark Delivered
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {myOrders.length === 0 && <p className="text-center text-gray-500 py-10">No active orders.</p>}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Inventory ({filteredInventory.length})</h2>
                            <button onClick={() => setIsAddProductModalOpen(true)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold shadow-sm hover:bg-green-700">+ Add Product</button>
                         </div>
                         
                         <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search inventory..." 
                                className="flex-1 p-2 border rounded-lg text-sm"
                            />
                             <button onClick={handleVoiceSearch} className="bg-gray-200 p-2 rounded-lg hover:bg-gray-300">
                                🎤
                            </button>
                        </div>
                         
                         <div className="space-y-3">
                            {filteredInventory.map(vp => {
                                const product = productMap.get(vp.productId);
                                const isEditing = editingProduct === vp.id;

                                return (
                                    <div key={vp.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-gray-800">{product?.name || 'Unknown Product'}</p>
                                                <p className="text-xs text-gray-500">Unit: {vp.unit}</p>
                                            </div>
                                            <button 
                                                onClick={() => isEditing ? handleUpdateProduct(vp) : startEditing(vp)}
                                                className={`text-xs px-3 py-1 rounded font-semibold ${isEditing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {isEditing ? 'Save' : 'Edit'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-400 font-bold">Price (₹)</label>
                                                {isEditing ? (
                                                    <input type="number" value={editValues.price} onChange={e => setEditValues(v => ({...v, price: e.target.value}))} className="w-full p-1 border rounded text-sm" />
                                                ) : (
                                                    <p className="font-semibold text-gray-800">{formatCurrency(vp.price)}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase text-gray-400 font-bold">Stock</label>
                                                {isEditing ? (
                                                    <input type="number" value={editValues.stock} onChange={e => setEditValues(v => ({...v, stock: e.target.value}))} className="w-full p-1 border rounded text-sm" />
                                                ) : (
                                                    <p className={`font-mono font-bold ${vp.stockQuantity === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                                        {vp.stockQuantity}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredInventory.length === 0 && (
                                <p className="text-center text-gray-500 py-8 bg-white rounded-lg border border-dashed">
                                    {searchQuery ? 'No products match your search.' : 'Your inventory is empty. Add products to start selling.'}
                                </p>
                            )}
                         </div>
                    </div>
                )}

                {activeTab === 'khata' && (
                    <KhataScreen currentUser={currentUser} vendor={vendor} />
                )}

                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        <DealerInsights currentUser={currentUser} />
                        <ProductBundlingView bundles={bundles} />
                        <CustomerSegmentsView dealerMandal={vendor.mandal} />
                        <DealerSalesView dealerMandal={vendor.mandal} salesTrends={salesTrends} />
                    </div>
                )}
            </div>
            
            {isTopUpModalOpen && (
                <PurchaseCreditsModal 
                    onClose={() => setIsTopUpModalOpen(false)} 
                    currentTenant={{ id: '', name: 'Self', credit_balance: 0, subscriptionStatus: '', createdAt: 0 }} 
                    vendor={vendor} 
                    setNotification={(n) => alert(n?.message)} 
                />
            )}
            
            {isAddProductModalOpen && (
                <AddProductModal 
                    onClose={() => setIsAddProductModalOpen(false)}
                    availableProducts={availableToAdd}
                    onSave={handleAddProduct}
                />
            )}
        </div>
    );
};

export default MitraDashboard;
