import { ProductCategory, Vendor, Product, VendorProduct, VendorStatus } from '../types';

export const SAMPLE_CATEGORIES: Omit<ProductCategory, 'tenantId'>[] = [
    {
        id: 'cat_fertilizers',
        name: 'Fertilizers',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>'
    },
    {
        id: 'cat_pesticides',
        name: 'Pesticides',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M9 11V9a2 2 0 012-2h2a2 2 0 012 2v2m-6 4h6" /></svg>'
    },
    {
        id: 'cat_tools',
        name: 'Tools',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l-4 4-4 4M6 16l-4-4 4-4" /></svg>'
    }
];

export const SAMPLE_VENDORS: Omit<Vendor, 'tenantId' | 'createdAt'>[] = [
    {
        id: 'vendor_agri_solutions',
        name: 'Agri Solutions Inc.',
        contactPerson: 'Ramesh Kumar',
        mobileNumber: '9876543210',
        address: '123 Agri St, Hanmakonda',
        // FIX: Changed string literal to use enum value to fix type error.
        status: VendorStatus.Verified,
        rating: 4.5
    },
    {
        id: 'vendor_farm_essentials',
        name: 'Farm Essentials Co.',
        contactPerson: 'Sita Devi',
        mobileNumber: '9876543211',
        address: '456 Farmer Rd, Mulugu',
        // FIX: Changed string literal to use enum value to fix type error.
        status: VendorStatus.Verified,
        rating: 4.2
    }
];

export const SAMPLE_PRODUCTS: Omit<Product, 'tenantId' | 'createdAt'>[] = [
    {
        id: 'prod_urea',
        name: 'Urea Fertilizer',
        description: 'High-nitrogen fertilizer for promoting lush green growth in oil palms.',
        imageUrl: 'https://i.imgur.com/example_urea.jpg', // Placeholder
        categoryId: 'cat_fertilizers',
        isQualityVerified: true,
    },
    {
        id: 'prod_dap',
        name: 'DAP Fertilizer',
        description: 'Di-Ammonium Phosphate for strong root development and flowering.',
        imageUrl: 'https://i.imgur.com/example_dap.jpg', // Placeholder
        categoryId: 'cat_fertilizers',
        isQualityVerified: true,
    },
    {
        id: 'prod_ neem_oil',
        name: 'Neem Oil Pesticide',
        description: 'Organic pesticide for controlling common oil palm pests.',
        imageUrl: 'https://i.imgur.com/example_neem.jpg', // Placeholder
        categoryId: 'cat_pesticides',
        isQualityVerified: true,
    },
    {
        id: 'prod_harvesting_sickle',
        name: 'Harvesting Sickle',
        description: 'Long-reach, durable sickle for harvesting Fresh Fruit Bunches.',
        imageUrl: 'https://i.imgur.com/example_sickle.jpg', // Placeholder
        categoryId: 'cat_tools',
        isQualityVerified: true,
    }
];

export const SAMPLE_VENDOR_PRODUCTS: Omit<VendorProduct, 'updatedAt'>[] = [
    {
        id: 'vp_1',
        vendorId: 'vendor_agri_solutions',
        productId: 'prod_urea',
        price: 1200,
        stockQuantity: 500,
        unit: '50kg Bag'
    },
    {
        id: 'vp_2',
        vendorId: 'vendor_farm_essentials',
        productId: 'prod_urea',
        price: 1250,
        stockQuantity: 300,
        unit: '50kg Bag'
    },
    {
        id: 'vp_3',
        vendorId: 'vendor_agri_solutions',
        productId: 'prod_dap',
        price: 1800,
        stockQuantity: 400,
        unit: '50kg Bag'
    },
    {
        id: 'vp_4',
        vendorId: 'vendor_agri_solutions',
        productId: 'prod_ neem_oil',
        price: 800,
        stockQuantity: 200,
        unit: '1 Litre'
    },
    {
        id: 'vp_5',
        vendorId: 'vendor_farm_essentials',
        productId: 'prod_harvesting_sickle',
        price: 2500,
        stockQuantity: 150,
        unit: 'piece'
    }
];