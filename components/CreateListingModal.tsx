import React, { useState, useMemo } from 'react';
import { User, VendorStatus } from '../types';
import { useDatabase } from '../DatabaseContext';
import { VendorModel, ProductModel, VendorProductModel, ProductCategoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';

interface CreateListingModalProps {
    onClose: () => void;
    currentUser: User;
    categories: ProductCategoryModel[];
    onSaveSuccess: () => void;
}

const CreateListingModal: React.FC<CreateListingModalProps> = ({ onClose, currentUser, categories, onSaveSuccess }) => {
    const database = useDatabase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formState, setFormState] = useState({
        name: '',
        description: '',
        categoryId: '',
        price: '',
        unit: 'kg',
        stockQuantity: '',
    });

    const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name })), [categories]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormState(prev => ({...prev, [e.target.name]: e.target.value }));
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.categoryId) {
            alert("Please select a category.");
            return;
        }
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                // 1. Find or create a 'vendor' profile for the farmer
                let vendorRecord: VendorModel;
                // For P2P MVP, we assume the user record corresponds to a farmer record
                // and the user ID can be used as the farmerId reference.
                const farmerIdForVendor = currentUser.id; 
                const existingVendors = await database.get<VendorModel>('vendors').query(Q.where('farmer_id', farmerIdForVendor)).fetch();
                
                if (existingVendors.length > 0) {
                    vendorRecord = existingVendors[0];
                } else {
                    vendorRecord = await database.get<VendorModel>('vendors').create(v => {
                        v.name = currentUser.name;
                        v.contactPerson = currentUser.name;
                        v.mobileNumber = ''; // TODO: get from farmer/user profile if available
                        v.address = ''; // TODO: get from farmer/user profile if available
                        v.status = VendorStatus.Verified; // P2P sellers are auto-verified for MVP
                        v.rating = 0;
                        v.tenantId = currentUser.tenantId;
                        v.sellerType = 'FARMER';
                        v.farmerId = farmerIdForVendor;
                    });
                }
                
                // 2. Create the product record
                const newProduct = await database.get<ProductModel>('products').create(p => {
                    p.name = formState.name;
                    p.description = formState.description;
                    p.categoryId = formState.categoryId;
                    p.isQualityVerified = false; // P2P listings are not verified by default
                    p.tenantId = currentUser.tenantId;
                });
                
                // 3. Create the vendor_product (the listing)
                await database.get<VendorProductModel>('vendor_products').create(vp => {
                    vp.vendorId = vendorRecord.id;
                    vp.productId = newProduct.id;
                    vp.price = parseFloat(formState.price);
                    vp.stockQuantity = parseInt(formState.stockQuantity, 10);
                    vp.unit = formState.unit;
                });
            });
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create listing:", error);
            alert('An error occurred while creating the listing. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSave} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">List an Item for Sale</h2></div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input name="name" value={formState.name} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Organic Groundnuts" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <CustomSelect options={categoryOptions} value={formState.categoryId} onChange={v => setFormState(s => ({ ...s, categoryId: v}))} placeholder="-- Select a Category --" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" value={formState.description} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                            <input name="price" type="number" step="0.01" value={formState.price} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input name="stockQuantity" type="number" value={formState.stockQuantity} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Unit</label>
                            <input name="unit" value={formState.unit} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., kg, quintal" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <div className="flex text-sm text-gray-600"><p className="pl-1">Image upload coming soon</p></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Listing...' : 'List Item'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateListingModal;