
import React, { useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { OrderModel, OrderItemModel, VendorProductModel, ProductModel, VendorModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { formatCurrency } from '../lib/utils';
import { Order, OrderItem, VendorProduct, Product, Vendor } from '../types';

interface OrderConfirmationPageProps {
    orderId: string;
    onNavigate: (view: 'marketplace' | 'dashboard') => void;
}

const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({ orderId, onNavigate }) => {
    const database = useDatabase();
    
    // Fetch all data needed to reconstruct the order details
    const order = useQuery(useMemo(() => database.get<OrderModel>('orders').query(Q.where('id', orderId)), [database, orderId]))[0];
    const orderItems = useQuery(useMemo(() => database.get<OrderItemModel>('order_items').query(Q.where('order_id', orderId)), [database, orderId]));
    const allVendorProducts = useQuery(useMemo(() => database.get<VendorProductModel>('vendor_products').query(), [database]));
    const allProducts = useQuery(useMemo(() => database.get<ProductModel>('products').query(), [database]));
    const allVendors = useQuery(useMemo(() => database.get<VendorModel>('vendors').query(), [database]));
    
    // Fetch farmer details for the order
    const farmer = useQuery(useMemo(() => order ? database.get<FarmerModel>('farmers').query(Q.where('id', order.farmerId)) : database.get<FarmerModel>('farmers').query(Q.where('id', 'null')), [database, order]))[0];


    // Create maps for efficient lookup
    const vendorProductMap = useMemo(() => new Map(allVendorProducts.map(vp => [vp.id, vp._raw as unknown as VendorProduct])), [allVendorProducts]);
    const productMap = useMemo(() => new Map(allProducts.map(p => [p.id, p._raw as unknown as Product])), [allProducts]);
    const vendorMap = useMemo(() => new Map(allVendors.map(v => [v.id, v._raw as unknown as Vendor])), [allVendors]);
    
    // Reconstruct detailed items for display
    const detailedItems = useMemo(() => {
        return orderItems.map(item => {
            const vp = vendorProductMap.get(item.vendorProductId);
            const product = vp ? productMap.get(vp.productId) : undefined;
            const vendor = vp ? vendorMap.get(vp.vendorId) : undefined;
            return {
                orderItem: item._raw as unknown as OrderItem,
                productName: product?.name || 'Unknown Product',
                vendorName: vendor?.name || 'Unknown Vendor',
            };
        });
    }, [orderItems, vendorProductMap, productMap, vendorMap]);

    if (!order) {
        return <div className="text-center p-10">Loading order details...</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full flex items-center justify-center">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-800">Thank You!</h1>
                <p className="text-gray-600 mt-2">Your order has been placed successfully.</p>
                <div className="mt-6 p-4 bg-gray-50 border rounded-lg text-left">
                    <p className="font-semibold">Order ID: <span className="font-mono text-gray-700">{order.id.slice(-12)}</span></p>
                    <p className="font-semibold">For Farmer: <span className="font-normal text-gray-700">{farmer?.fullName || '...'}</span></p>
                    <p className="font-semibold">Order Date: <span className="font-normal text-gray-700">{new Date(order.orderDate).toLocaleDateString()}</span></p>
                    <p className="font-semibold">Total Amount: <span className="font-bold text-green-700">{formatCurrency(order.totalAmount)}</span></p>
                    
                    <div className="mt-4 border-t pt-4">
                        <h3 className="font-semibold mb-2">Items Ordered:</h3>
                        <ul className="space-y-1 text-sm">
                            {detailedItems.map(item => (
                                <li key={item.orderItem.id} className="flex justify-between">
                                    <span>{item.productName} (x{item.orderItem.quantity})</span>
                                    <span>{formatCurrency(item.orderItem.pricePerUnit * item.orderItem.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                    <button onClick={() => onNavigate('marketplace')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Continue Shopping</button>
                    <button onClick={() => onNavigate('dashboard')} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">Go to Dashboard</button>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationPage;
