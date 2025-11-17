import React, { useMemo, useState } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ProductCategoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { useCart } from '../CartContext';
import { formatCurrency } from '../lib/utils';
import { User } from '../types';
import CreateListingModal from './CreateListingModal';

interface MarketplacePageProps {
    onBack: () => void;
    onNavigate: (view: 'product-list' | 'checkout', param?: string) => void;
    currentUser: User;
}

const CategoryCard: React.FC<{ title: string; iconSvg?: string; onClick: () => void }> = ({ title, iconSvg, onClick }) => (
    <button onClick={onClick} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:border-green-300 border border-transparent transition-all text-center w-full flex flex-col items-center justify-center aspect-square">
        {iconSvg ? (
            <div className="bg-green-100 p-4 rounded-full mb-4" dangerouslySetInnerHTML={{ __html: iconSvg }} />
        ) : (
            <div className="bg-green-100 p-4 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
        )}
        <h3 className="font-bold text-gray-800">{title}</h3>
    </button>
);

const CartWidget: React.FC<{ onNavigate: (view: 'checkout') => void }> = ({ onNavigate }) => {
    const { itemCount, totalPrice } = useCart();

    if (itemCount === 0) {
        return null;
    }
    
    return (
        <div className="fixed bottom-6 right-6 z-40">
            <button onClick={() => onNavigate('checkout')} className="bg-green-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-4 hover:bg-green-700 transition-transform hover:scale-105">
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{itemCount}</span>
                </div>
                <div>
                    <span className="font-bold">View Cart</span>
                    <span className="text-sm ml-2">({formatCurrency(totalPrice)})</span>
                </div>
            </button>
        </div>
    );
};


const MarketplacePage: React.FC<MarketplacePageProps> = ({ onBack, onNavigate, currentUser }) => {
    const database = useDatabase();
    const categories = useQuery(useMemo(() => database.get<ProductCategoryModel>('product_categories').query(Q.sortBy('name', 'asc')), [database]));
    const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);

    const handleSaveSuccess = () => {
        alert('Item listed successfully!');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Marketplace</h1>
                        <p className="text-gray-500">Your trusted source for quality agricultural inputs.</p>
                    </div>
                     <button onClick={() => setIsCreateListingOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">
                        + Sell an Item
                    </button>
                </div>

                {/* Search Bar Placeholder */}
                <div className="mb-8">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for products or vendors..."
                            className="w-full p-4 pl-12 border border-gray-300 rounded-lg text-lg"
                            disabled
                        />
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                     <p className="text-xs text-gray-500 mt-2">Product search coming soon!</p>
                </div>

                {/* Categories */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">Browse by Category</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {categories.map(category => (
                             <CategoryCard
                                key={category.id}
                                title={category.name}
                                iconSvg={category.iconSvg}
                                onClick={() => onNavigate('product-list', category.id)}
                            />
                        ))}
                        {categories.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 py-10 bg-white rounded-lg">
                                No product categories found. An administrator needs to add them.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <CartWidget onNavigate={onNavigate} />
            {isCreateListingOpen && (
                <CreateListingModal 
                    onClose={() => setIsCreateListingOpen(false)} 
                    currentUser={currentUser} 
                    categories={categories}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}
        </div>
    );
};

export default MarketplacePage;