import React, { useState, useMemo, useCallback } from 'react';
import { useCart } from '../CartContext';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, OrderModel, OrderItemModel } from '../db';
import { Farmer, OrderStatus } from '../types';
import CustomSelect from './CustomSelect';
import { formatCurrency } from '../lib/utils';

interface CheckoutPageProps {
    onBack: () => void;
    onOrderPlaced: (orderId: string) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack, onOrderPlaced }) => {
    const { items, itemCount, totalPrice, clearCart } = useCart();
    const database = useDatabase();

    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Digital'>('Digital');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const farmerOptions = useMemo(() => allFarmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})` })), [allFarmers]);
    
    const handleSelectFarmer = (farmerId: string) => {
        setSelectedFarmerId(farmerId);
        const farmer = allFarmers.find(f => f.id === farmerId);
        setDeliveryAddress(farmer?.address || '');
    };
    
    const handlePlaceOrder = useCallback(async () => {
        if (!selectedFarmerId || items.length === 0) {
            alert('Please select a farmer and add items to your cart.');
            return;
        }

        setIsSubmitting(true);
        try {
            let newOrderId = '';
            await database.write(async () => {
                const newOrder = await database.get<OrderModel>('orders').create(order => {
                    order.farmerId = selectedFarmerId;
                    order.orderDate = new Date().toISOString();
                    order.status = OrderStatus.Pending;
                    order.totalAmount = totalPrice;
                    order.paymentMethod = paymentMethod;
                    order.deliveryAddress = deliveryAddress;
                    order.deliveryInstructions = deliveryInstructions;
                    // In a real scenario, these would be populated after API calls
                    // order.paymentTransactionId = '...';
                    // order.logisticsPartnerId = '...';
                });

                newOrderId = newOrder.id;

                for (const item of items) {
                    await database.get<OrderItemModel>('order_items').create(orderItem => {
                        orderItem.orderId = newOrder.id;
                        orderItem.vendorProductId = item.vendorProduct.id;
                        orderItem.quantity = item.quantity;
                        orderItem.pricePerUnit = item.vendorProduct.price;
                    });
                }
            });
            clearCart();
            onOrderPlaced(newOrderId);
        } catch (error) {
            console.error('Failed to place order:', error);
            alert('An error occurred while placing the order.');
        } finally {
            setIsSubmitting(false);
        }

    }, [selectedFarmerId, items, totalPrice, paymentMethod, deliveryAddress, deliveryInstructions, database, clearCart, onOrderPlaced]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                    &larr; Back to Marketplace
                </button>
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Checkout</h1>

                {itemCount > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">1. Farmer & Delivery</h2>
                                <div className="space-y-4">
                                    <CustomSelect label="Placing order for Farmer:" options={farmerOptions} value={selectedFarmerId} onChange={handleSelectFarmer} placeholder="-- Select a Farmer --" />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                                        <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Delivery Instructions (Optional)</label>
                                        <input type="text" value={deliveryInstructions} onChange={e => setDeliveryInstructions(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">2. Payment Method</h2>
                                <div className="space-y-3">
                                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${paymentMethod === 'Digital' ? 'bg-green-50 border-green-200' : ''}`}>
                                        <input type="radio" name="paymentMethod" value="Digital" checked={paymentMethod === 'Digital'} onChange={() => setPaymentMethod('Digital')} className="h-4 w-4 text-green-600" />
                                        <span className="ml-3 font-semibold">Digital Payment</span>
                                        <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded-full">Coming Soon</span>
                                    </label>
                                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${paymentMethod === 'Cash' ? 'bg-green-50 border-green-200' : ''}`}>
                                        <input type="radio" name="paymentMethod" value="Cash" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')} className="h-4 w-4 text-green-600" />
                                        <span className="ml-3 font-semibold">Cash on Delivery</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border-b pb-4">
                                    {items.map(item => (
                                        <div key={item.vendorProduct.id} className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.vendorProduct.price)}</p>
                                            </div>
                                            <p className="font-semibold">{formatCurrency(item.quantity * item.vendorProduct.price)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="py-4 space-y-2 text-lg">
                                    <div className="flex justify-between font-bold text-gray-800">
                                        <span>Total</span>
                                        <span>{formatCurrency(totalPrice)}</span>
                                    </div>
                                </div>
                                <button onClick={handlePlaceOrder} disabled={!selectedFarmerId || isSubmitting} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400">
                                    {isSubmitting ? 'Placing Order...' : 'Place Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">Your Cart is Empty</h2>
                        <p className="mt-2">Browse the marketplace to add items to your cart.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;