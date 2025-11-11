import React, { useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ProductCategoryModel, ProductModel, VendorProductModel, VendorModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { useCart } from '../CartContext';
import { formatCurrency } from '../lib/utils';
import { Product, Vendor, VendorProduct } from '../types';

interface ProductListPageProps {
    categoryId: string;
    onBack: () => void;
}

interface EnrichedVendorProduct {
    vendorProduct: VendorProduct;
    product: Product;
    vendor: Vendor;
}

const ProductCard: React.FC<{ item: EnrichedVendorProduct }> = ({ item }) => {
    const { addToCart } = useCart();
    const { product, vendorProduct, vendor } = item;

    const handleAddToCart = () => {
        addToCart({ product, vendorProduct, vendor, quantity: 1 });
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="h-48 bg-gray-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L14 8" /></svg>
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">Sold by: {vendor.name}</p>
                <p className="text-sm text-gray-600 flex-grow">{product.description}</p>
                <div className="mt-4 flex justify-between items-center">
                    <div>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(vendorProduct.price)}</p>
                        <p className="text-xs text-gray-500">per {vendorProduct.unit}</p>
                    </div>
                    <button onClick={handleAddToCart} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProductListPage: React.FC<ProductListPageProps> = ({ categoryId, onBack }) => {
    const database = useDatabase();
    
    // Data fetching
    const category = useQuery(useMemo(() => database.get<ProductCategoryModel>('product_categories').query(Q.where('id', categoryId)), [database, categoryId]))[0];
    const products = useQuery(useMemo(() => database.get<ProductModel>('products').query(Q.where('category_id', categoryId)), [database, categoryId]));
    const vendors = useQuery(useMemo(() => database.get<VendorModel>('vendors').query(), [database]));
    const vendorProducts = useQuery(useMemo(() => database.get<VendorProductModel>('vendor_products').query(), [database]));

    // Data enrichment
    const enrichedProducts = useMemo(() => {
        // FIX: Cast _raw to unknown first, then to the target type to resolve the type error.
        const productMap = new Map(products.map(p => [p.id, p._raw as unknown as Product]));
        const vendorMap = new Map(vendors.map(v => [v.id, v._raw as unknown as Vendor]));
        
        return vendorProducts
            .map(vp => {
                const product = productMap.get(vp.productId);
                const vendor = vendorMap.get(vp.vendorId);
                if (product && vendor) {
                    return {
                        // FIX: Cast _raw to unknown first, then to the target type to resolve the type error.
                        vendorProduct: vp._raw as unknown as VendorProduct,
                        product,
                        vendor,
                    };
                }
                return null;
            })
            .filter((item): item is EnrichedVendorProduct => item !== null && item.product.categoryId === categoryId);
    }, [products, vendors, vendorProducts, categoryId]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                    &larr; Back to Marketplace
                </button>
                <h1 className="text-3xl font-bold text-gray-800 mb-6">{category?.name || 'Products'}</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {enrichedProducts.map(item => (
                        <ProductCard key={item.vendorProduct.id} item={item} />
                    ))}
                </div>
                {enrichedProducts.length === 0 && (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">No Products Found</h2>
                        <p className="mt-2">There are currently no products available in this category.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductListPage;