import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { VendorProduct, Product, Vendor } from './types';

export interface CartItem {
    vendorProduct: VendorProduct;
    product: Product;
    vendor: Vendor;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    updateQuantity: (vendorProductId: string, quantity: number) => void;
    removeFromCart: (vendorProductId: string) => void;
    clearCart: () => void;
    itemCount: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = (newItem: CartItem) => {
        setItems(prevItems => {
            const existingItem = prevItems.find(i => i.vendorProduct.id === newItem.vendorProduct.id);
            if (existingItem) {
                // Update quantity if item already exists
                return prevItems.map(i =>
                    i.vendorProduct.id === newItem.vendorProduct.id
                        ? { ...i, quantity: i.quantity + newItem.quantity }
                        : i
                );
            }
            // Add new item
            return [...prevItems, newItem];
        });
    };

    const updateQuantity = (vendorProductId: string, quantity: number) => {
        setItems(prevItems => {
            if (quantity <= 0) {
                // Remove item if quantity is 0 or less
                return prevItems.filter(i => i.vendorProduct.id !== vendorProductId);
            }
            return prevItems.map(i =>
                i.vendorProduct.id === vendorProductId ? { ...i, quantity } : i
            );
        });
    };

    const removeFromCart = (vendorProductId: string) => {
        setItems(prevItems => prevItems.filter(i => i.vendorProduct.id !== vendorProductId));
    };

    const clearCart = () => {
        setItems([]);
    };

    const itemCount = useMemo(() => {
        return items.reduce((total, item) => total + item.quantity, 0);
    }, [items]);

    const totalPrice = useMemo(() => {
        return items.reduce((total, item) => total + item.vendorProduct.price * item.quantity, 0);
    }, [items]);

    return (
        <CartContext.Provider value={{ items, addToCart, updateQuantity, removeFromCart, clearCart, itemCount, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
