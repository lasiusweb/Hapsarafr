import React, { useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ProductCategoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';

interface MarketplacePageProps {
    onBack: () => void;
    onNavigate: (view: 'product-list', param: string) => void;
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

const MarketplacePage: React.FC<MarketplacePageProps> = ({ onBack, onNavigate }) => {
    const database = useDatabase();
    const categories = useQuery(useMemo(() => database.get<ProductCategoryModel>('product_categories').query(Q.sortBy('name', 'asc')), [database]));

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Marketplace</h1>
                        <p className="text-gray-500">Your trusted source for quality agricultural inputs.</p>
                    </div>
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketplacePage;