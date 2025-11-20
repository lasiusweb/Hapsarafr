
import React, { useMemo, useState } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { ProductCategoryModel, VendorModel, LeadModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { useCart } from '../CartContext';
import { formatCurrency, farmerModelToPlain } from '../lib/utils';
import { User, VendorStatus, Farmer } from '../types';
import CreateListingModal from './CreateListingModal';
import CustomSelect from './CustomSelect';

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

const PartnerCard: React.FC<{ vendor: VendorModel; onContact: (v: VendorModel) => void; distanceTag?: string }> = ({ vendor, onContact, distanceTag }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow relative overflow-hidden">
        {distanceTag && (
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                {distanceTag}
            </div>
        )}
        <div className="flex justify-between items-start mt-2">
            <div>
                <h3 className="font-bold text-lg text-gray-800">{vendor.name}</h3>
                <p className="text-sm text-gray-500">{vendor.sellerType} • {vendor.district}</p>
                {vendor.mandal && <p className="text-xs text-gray-400">{vendor.mandal}</p>}
            </div>
            {vendor.status === VendorStatus.Verified && (
                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Verified
                </span>
            )}
        </div>
        <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p><strong>Contact:</strong> {vendor.contactPerson}</p>
            <p><strong>Rating:</strong> {vendor.rating.toFixed(1)} ★</p>
        </div>
        <button onClick={() => onContact(vendor)} className="mt-4 w-full py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 transition">
            Contact Partner
        </button>
    </div>
);

const ContactPartnerModal: React.FC<{ onClose: () => void; onSend: (farmerId: string, notes: string) => void; vendorName: string; farmers: FarmerModel[] }> = ({ onClose, onSend, vendorName, farmers }) => {
    const [farmerId, setFarmerId] = useState('');
    const [notes, setNotes] = useState('');
    
    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: f.fullName })), [farmers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!farmerId) return alert('Please select a farmer.');
        onSend(farmerId, notes);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Contact {vendorName}</h2></div>
                <div className="p-8 space-y-4">
                    <p className="text-sm text-gray-600">Generate a lead for this partner. They will be notified to contact the farmer.</p>
                    <CustomSelect label="Select Farmer" options={farmerOptions} value={farmerId} onChange={setFarmerId} placeholder="-- Choose Farmer --" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Inquiry Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded-md mt-1" rows={3} placeholder="e.g. Needs drone spraying for 5 acres." />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold">Send Request</button>
                </div>
            </form>
        </div>
    );
};

const MarketplacePage: React.FC<MarketplacePageProps> = ({ onBack, onNavigate, currentUser }) => {
    const database = useDatabase();
    const [activeTab, setActiveTab] = useState<'products' | 'partners'>('products');
    const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
    const [contactModalVendor, setContactModalVendor] = useState<VendorModel | null>(null);
    const [contextFarmerId, setContextFarmerId] = useState<string>('');

    const categories = useQuery(useMemo(() => database.get<ProductCategoryModel>('product_categories').query(Q.sortBy('name', 'asc')), [database]));
    // Filter partners (vendors who are not just selling products but offering services, or general verified vendors)
    const partners = useQuery(useMemo(() => database.get<VendorModel>('vendors').query(Q.where('status', VendorStatus.Verified)), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})` })), [farmers]);

    const contextFarmer = useMemo(() => farmers.find(f => f.id === contextFarmerId), [farmers, contextFarmerId]);

    // Hyper-Local Sorting Logic
    const sortedPartners = useMemo(() => {
        if (!contextFarmer) return partners;

        return [...partners].sort((a, b) => {
            // Score calculation (Lower score is closer/better)
            // 0 = Same Village, 1 = Same Mandal, 2 = Same District, 3 = Far
            const getScore = (v: VendorModel) => {
                if (v.mandal === contextFarmer.mandal) return 0; // Treating Village same as Mandal for simplicity as vendor village data often missing
                if (v.district === contextFarmer.district) return 1;
                return 2;
            };

            const scoreA = getScore(a);
            const scoreB = getScore(b);

            if (scoreA !== scoreB) return scoreA - scoreB;
            return b.rating - a.rating; // Then sort by rating desc
        });
    }, [partners, contextFarmer]);

    const getDistanceTag = (vendor: VendorModel) => {
        if (!contextFarmer) return undefined;
        if (vendor.mandal === contextFarmer.mandal) return "📍 Local (Same Mandal)";
        if (vendor.district === contextFarmer.district) return "🚗 Nearby (Same District)";
        return undefined;
    };

    const handleContactPartner = async (farmerId: string, notes: string) => {
        if (!contactModalVendor) return;
        try {
            await database.write(async () => {
                await database.get<LeadModel>('leads').create(l => {
                    l.farmerId = farmerId;
                    l.vendorId = contactModalVendor.id;
                    l.serviceCategory = 'General Inquiry'; // Could be dynamic
                    l.status = 'Pending';
                    l.notes = notes;
                    l.tenantId = currentUser.tenantId;
                });
            });
            alert("Request sent successfully! The partner will contact the farmer.");
            setContactModalVendor(null);
        } catch (e) {
            console.error(e);
            alert("Failed to send request.");
        }
    };

    const handleSaveSuccess = () => {
        alert('Item listed successfully!');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Value Directory</h1>
                        <p className="text-gray-500">Trusted products and partners for your ecosystem.</p>
                    </div>
                     <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex items-center gap-4 border border-indigo-100">
                    <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="flex-grow">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Location Context</p>
                         <CustomSelect 
                            options={farmerOptions} 
                            value={contextFarmerId} 
                            onChange={setContextFarmerId} 
                            placeholder="Select Farmer to see local options..." 
                            className="mt-1 w-full max-w-md"
                        />
                    </div>
                </div>

                <div className="flex space-x-4 mb-6 border-b border-gray-200">
                    <button onClick={() => setActiveTab('products')} className={`pb-3 px-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'products' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Agri-Store</button>
                    <button onClick={() => setActiveTab('partners')} className={`pb-3 px-2 text-lg font-bold border-b-2 transition-colors ${activeTab === 'partners' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Service Partners</button>
                </div>

                {/* Tab Content */}
                {activeTab === 'products' ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700">Browse Categories</h2>
                            <button onClick={() => setIsCreateListingOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm">+ Sell an Item</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {categories.map(category => (
                                <CategoryCard key={category.id} title={category.name} iconSvg={category.iconSvg} onClick={() => onNavigate('product-list', category.id)} />
                            ))}
                            {categories.length === 0 && <div className="col-span-full text-center text-gray-500 py-10 bg-white rounded-lg">No product categories found.</div>}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-800"><strong>Verified Partners Only:</strong> All partners listed here have undergone physical verification by Hapsara Field Officers to ensure trust and quality service.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedPartners.map(vendor => (
                                <PartnerCard key={vendor.id} vendor={vendor} onContact={setContactModalVendor} distanceTag={getDistanceTag(vendor)} />
                            ))}
                             {sortedPartners.length === 0 && <div className="col-span-full text-center text-gray-500 py-10 bg-white rounded-lg">No verified partners available in your area yet.</div>}
                        </div>
                    </>
                )}

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
            
            {contactModalVendor && (
                <ContactPartnerModal 
                    onClose={() => setContactModalVendor(null)} 
                    vendorName={contactModalVendor.name}
                    farmers={farmers}
                    onSend={handleContactPartner}
                />
            )}
        </div>
    );
};

export default MarketplacePage;
