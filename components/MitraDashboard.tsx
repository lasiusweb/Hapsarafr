
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
    const [editingProduct, setEditingProduct] = useState<string | null>(null); 
    const [editValues, setEditValues] = useState({ price: '', stock: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [isListening, setIsListening] = useState(false);

    // Vendor/Dealer Context
    const vendorQuery = useMemo(() => database.get<VendorModel>('vendors').query(Q.where('user_id', currentUser.id)), [database, currentUser.id]);
    const vendor = useQuery(vendorQuery)[0];

    // Wallet Context
    const walletQuery = useMemo(() => vendor ? database.get<WalletModel>('wallets').query(Q.where('vendor_id', vendor.id)) : database.get<WalletModel>('wallets').query(Q.where('id', 'null')), [database, vendor]);
    const vendorWallet = useQuery(walletQuery)[0];

    // Data Fetching
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

    // Inventory Data
    const myVendorProducts = useQuery(useMemo(() => {
        if (!vendor) return database.get<VendorProductModel>('vendor_products').query(Q.where('id', 'null'));
        return database.get<VendorProductModel>('vendor_products').query(Q.where('vendor_id', vendor.id));
    }, [database, vendor]));

    const products = useQuery(useMemo(() => database.get<ProductModel>('products').query(), [database]));
    const allVendorProducts = useQuery(useMemo(() => database.get<VendorProductModel>('vendor_products').query(), [database]));
    const inventorySignals = useQuery(useMemo(() => database.get<DealerInventorySignalModel>('dealer_inventory_signals').query(Q.where('dealer_id', vendor?.id || 'unknown')), [database, vendor?.id]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));

    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

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
                        const newQty = Math.max(0, vp.stockQuantity - item.quantity);
                        await vp.update(v => { v.stockQuantity = newQty; });
                        
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
            await database.get<VendorProductModel>('vendor_products').create(vp => {
                vp.vendorId = vendor.id;
                vp.productId = productId;
                vp.price = price;
                vp.stockQuantity = stock;
                vp.unit = 'units';
            });

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
            await (vp as any).update((v: VendorProductModel) => {
                v.price = newPrice;
                v.stockQuantity = newStock;
            });

            const signal = inventorySignals.find(s => s.productId === vp.productId);
            if (signal) {
                await signal.update(s => {
                    s.stockQuantity = newStock;
                    s.isAvailable = newStock > 0;
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
        // @ts-ignore
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice search not supported.");
            return;
        }
        setIsListening(true);
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSearchQuery(transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    if (!vendor) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Dealer Profile Not Found</p></div>;

    const filteredInventory = useMemo(() => {
        if (!searchQuery) return myVendorProducts;
        return myVendorProducts.filter(vp => {
            const product = productMap.get(vp.productId);
            return product?.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [myVendorProducts, searchQuery, productMap]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
             <div className="bg-indigo-900 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">Hapsara Mitra</h1>
                            <p className="text-xs text-indigo-200">{vendor.name}</p>
                        </div>
                        <button onClick={onBack} className="text-xs bg-indigo-800 px-3 py-1 rounded hover:bg-indigo-700">Exit</button>
                    </div>
                    <div className="bg-indigo-800/50 p-3 rounded-lg flex justify-between items-center">
                        <div className="flex flex-col">
                             <span className="text-xs text-indigo-200 uppercase font-semibold">My Wallet Balance</span>
                             <span className="text-xl font-bold font-mono">{formatCurrency(vendorWallet?.balance || 0)}</span>
                        </div>
                        <button onClick={() => setIsTopUpModalOpen(true)} className="px-3 py-1.5 bg-white text-indigo-900 text-xs font-bold rounded shadow-sm hover:bg-indigo-50 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                            Add Credits
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-6">
                <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-200">
                    {['orders', 'inventory', 'khata', 'insights'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeTab === tab ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 relative">
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search orders..." className="flex-1 p-2 border rounded-lg text-sm" />
                            <button onClick={handleVoiceSearch} className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                {isListening ? '🛑' : '🎤'}
                            </button>
                        </div>
                        {myOrders.map(order => {
                            const farmer = farmerMap.get(order.farmerId);
                            return (
                                <div key={order.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{farmer?.fullName || 'Unknown'}</h3>
                                            <p className="text-xs text-gray-500">Order #{(order as any).id.slice(-4)}</p>
                                        </div>
                                        <OrderStatusBadge status={order.status} />
                                    </div>
                                    <div className="flex justify-between items-end mt-4">
                                        <p className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                                        {order.status === OrderStatus.Pending && (
                                            <button onClick={() => handleWhatsAppConfirmation(order)} className="px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 flex items-center gap-1 shadow-sm">
                                                Confirm via WhatsApp
                                            </button>
                                        )}
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
                            <h2 className="text-lg font-bold text-gray-800">Inventory</h2>
                            <button onClick={() => setIsAddProductModalOpen(true)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold shadow-sm">+ Add Product</button>
                         </div>
                         <div className="space-y-3">
                            {filteredInventory.map(vp => {
                                const product = productMap.get(vp.productId);
                                const isEditing = editingProduct === vp.id;
                                return (
                                    <div key={vp.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <p className="font-bold text-gray-800">{product?.name || 'Unknown'}</p>
                                            <button onClick={() => isEditing ? handleUpdateProduct(vp) : startEditing(vp)} className="text-xs px-3 py-1 rounded font-semibold bg-gray-100 text-gray-600">
                                                {isEditing ? 'Save' : 'Edit'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[10px] uppercase text-gray-400 font-bold">Price</label>{isEditing ? <input type="number" value={editValues.price} onChange={e => setEditValues(v => ({...v, price: e.target.value}))} className="w-full p-1 border rounded text-sm" /> : <p className="font-semibold text-gray-800">{formatCurrency(vp.price)}</p>}</div>
                                            <div><label className="block text-[10px] uppercase text-gray-400 font-bold">Stock</label>{isEditing ? <input type="number" value={editValues.stock} onChange={e => setEditValues(v => ({...v, stock: e.target.value}))} className="w-full p-1 border rounded text-sm" /> : <p className="font-mono font-bold text-gray-800">{vp.stockQuantity}</p>}</div>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                )}

                {activeTab === 'khata' && <KhataScreen currentUser={currentUser} vendor={vendor} />}

                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        <DealerInsights currentUser={currentUser} />
                        <ProductBundlingView bundles={bundles} />
                        <CustomerSegmentsView dealerMandal={vendor.mandal} />
                        <DealerSalesView dealerMandal={vendor.mandal} salesTrends={salesTrends} />
                    </div>
                )}
            </div>
            
            {isTopUpModalOpen && <PurchaseCreditsModal onClose={() => setIsTopUpModalOpen(false)} currentTenant={{ id: '', name: 'Self', credit_balance: 0, subscriptionStatus: '', createdAt: 0 }} vendor={vendor} setNotification={(n) => alert(n?.message)} />}
            {isAddProductModalOpen && <AddProductModal onClose={() => setIsAddProductModalOpen(false)} availableProducts={availableToAdd} onSave={handleAddProduct} />}
        </div>
    );
};

export default MitraDashboard;
