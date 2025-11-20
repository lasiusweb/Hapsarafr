
import React, { useState, useMemo, useEffect } from 'react';
import { User, CommodityListing, ListingStatus, CommodityOffer, OfferStatus } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CommodityListingModel, FarmerModel, CommodityOfferModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { getFairPriceRange, getPriceTrend, PriceAnalysis } from '../lib/priceOracle';
import { formatCurrency, getGeoName, farmerModelToPlain } from '../lib/utils';

interface CommoditexDashboardProps {
    onBack: () => void;
    currentUser: User;
}

const MarketTicker: React.FC<{ crop: string; price: number; trend: string }> = ({ crop, price, trend }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center min-w-[200px]">
        <div>
            <p className="text-xs text-gray-500 uppercase font-bold">{crop}</p>
            <p className="text-lg font-bold text-gray-800">{formatCurrency(price)}</p>
        </div>
        <div className={`text-2xl ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? '▲' : '▼'}
        </div>
    </div>
);

// --- Modals ---

const CreateListingModal: React.FC<{ onClose: () => void; onSave: (data: any) => Promise<void>; farmers: FarmerModel[]; currentUser: User }> = ({ onClose, onSave, farmers, currentUser }) => {
    const [formState, setFormState] = useState({
        farmerId: '',
        cropName: 'Oil Palm',
        qualityGrade: 'Grade A',
        quantity: '',
        unit: 'tons',
        askPrice: '',
    });
    
    const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(null);

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: f.fullName })), [farmers]);
    
    const updateFairPrice = (crop: string, farmerId: string, quality: string) => {
        if (!farmerId) return;
        const farmer = farmers.find(f => f.id === farmerId);
        const district = farmer?.district || 'Warangal'; 
        const analysis = getFairPriceRange(crop, district, quality);
        setPriceAnalysis(analysis);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'cropName' || name === 'qualityGrade' || name === 'farmerId') {
               updateFairPrice(next.cropName, next.farmerId, next.qualityGrade);
            }
            return next;
        });
    };

    const handleFarmerChange = (id: string) => {
        setFormState(prev => {
            const next = { ...prev, farmerId: id };
            updateFairPrice(next.cropName, id, next.qualityGrade);
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState);
    };
    
    const askPriceNum = parseFloat(formState.askPrice);
    const quantityNum = parseFloat(formState.quantity);
    const isUnderselling = priceAnalysis && askPriceNum < priceAnalysis.low;
    const isSmallQuantity = quantityNum > 0 && quantityNum < 1 && formState.unit === 'tons'; 

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b bg-green-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-green-900">New Commodity Listing</h2>
                    <p className="text-sm text-green-700">Fair Price Discovery & Virtual Aggregation</p>
                </div>
                <div className="p-8 space-y-4 overflow-y-auto">
                    <CustomSelect label="Farmer" options={farmerOptions} value={formState.farmerId} onChange={handleFarmerChange} />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Crop</label>
                            <select name="cropName" value={formState.cropName} onChange={handleChange} className="w-full p-2 border rounded-md mt-1 bg-white">
                                <option>Oil Palm</option>
                                <option>Maize</option>
                                <option>Paddy</option>
                                <option>Cotton</option>
                                <option>Chilli</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Digital Grade</label>
                            <select name="qualityGrade" value={formState.qualityGrade} onChange={handleChange} className="w-full p-2 border rounded-md mt-1 bg-white">
                                <option>Grade A+</option>
                                <option>Grade A</option>
                                <option>Grade B</option>
                                <option>Grade C</option>
                            </select>
                             <p className="text-[10px] text-gray-500 mt-1">Pre-harvest grading helps prevent rejection.</p>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 transition-all">
                        <div className="flex justify-between items-center mb-3">
                             <p className="text-xs text-indigo-800 font-bold uppercase flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg>
                                Fair Price Logic
                             </p>
                        </div>
                        
                        {priceAnalysis ? (
                            <>
                                 <div className="grid grid-cols-4 gap-1 mb-3">
                                    {priceAnalysis.components.map((comp, idx) => (
                                        <div key={idx} className="bg-white p-1.5 rounded border text-center" title={comp.description}>
                                            <p className="text-[10px] text-gray-500">{comp.label}</p>
                                            <p className="text-xs font-bold text-gray-800">{formatCurrency(Math.round(comp.value))}</p>
                                            <div className="w-full bg-gray-200 h-1 mt-1 rounded-full overflow-hidden">
                                                <div className="bg-indigo-400 h-full" style={{width: comp.weight}}></div>
                                            </div>
                                        </div>
                                    ))}
                                 </div>

                                 <div className="flex justify-between items-center text-sm bg-white p-2 rounded border border-indigo-100">
                                    <span className="text-gray-600">Oracle Fair Price:</span>
                                    <span className="font-bold text-indigo-700 text-lg">{formatCurrency(priceAnalysis.fair)}</span>
                                 </div>
                                 
                                 {priceAnalysis.factors.some(f => f.impact === 'negative') && (
                                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        {priceAnalysis.factors.find(f => f.impact === 'negative')?.value} applied.
                                    </div>
                                 )}
                            </>
                        ) : <span className="text-xs text-gray-500">Select a farmer and crop to see fair price analysis.</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <div className="flex gap-2">
                                <input name="quantity" type="number" value={formState.quantity} onChange={handleChange} required className="w-full p-2 border rounded-md mt-1" />
                                <select name="unit" value={formState.unit} onChange={handleChange} className="mt-1 border rounded-md bg-gray-50">
                                    <option value="tons">tons</option>
                                    <option value="quintals">quintals</option>
                                    <option value="kg">kg</option>
                                </select>
                            </div>
                            {isSmallQuantity && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-purple-600 font-medium bg-purple-50 p-1 rounded">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Virtual Batching Active
                                </div>
                            )}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Ask Price (Per Unit)</label>
                            <div className="relative mt-1">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">₹</span>
                                <input 
                                    name="askPrice" 
                                    type="number" 
                                    value={formState.askPrice} 
                                    onChange={handleChange} 
                                    required 
                                    className={`w-full pl-7 p-2 border rounded-md ${isUnderselling ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300'}`} 
                                />
                            </div>
                            {isUnderselling && <p className="text-xs text-red-600 mt-1">Warning: Below fair value.</p>}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm font-semibold">Publish Listing</button>
                </div>
            </form>
        </div>
    );
};

const MakeOfferModal: React.FC<{ onClose: () => void; onOffer: (price: number, name: string, contact: string) => void; listing: CommodityListingModel }> = ({ onClose, onOffer, listing }) => {
    const [offerPrice, setOfferPrice] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerContact, setBuyerContact] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!offerPrice || !buyerName) return;
        onOffer(parseFloat(offerPrice), buyerName, buyerContact);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Place Bid / Offer</h2>
                    <p className="text-sm text-gray-500">For {listing.quantity} {listing.unit} of {listing.cropName}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Your Offer Price (Per Unit)</label>
                        <input type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} className="w-full p-2 border rounded-md mt-1" placeholder={`Ask: ${listing.askPrice}`} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Buyer Name</label>
                        <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full p-2 border rounded-md mt-1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                        <input type="tel" value={buyerContact} onChange={e => setBuyerContact(e.target.value)} className="w-full p-2 border rounded-md mt-1" />
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold">Submit Offer</button>
                </div>
            </form>
        </div>
    );
}

const ViewOffersModal: React.FC<{ onClose: () => void; listing: CommodityListingModel; onAccept: (offerId: string) => void }> = ({ onClose, listing, onAccept }) => {
    const database = useDatabase();
    // Fetch offers
    const offers = useQuery(useMemo(() => database.get<CommodityOfferModel>('commodity_offers').query(Q.where('listing_id', (listing as any).id), Q.sortBy('created_at', 'desc')), [database, listing]));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Offers Received</h2>
                    <p className="text-sm text-gray-500">Ask Price: {formatCurrency(listing.askPrice)}</p>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {offers.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No offers received yet.</p>
                    ) : (
                        offers.map(offer => (
                            <div key={offer.id} className="border p-4 rounded-lg flex justify-between items-center hover:bg-gray-50">
                                <div>
                                    <p className="font-bold text-lg text-gray-800">{formatCurrency(offer.offerPrice)}</p>
                                    <p className="text-sm text-gray-600">From: {offer.buyerName}</p>
                                    <p className="text-xs text-gray-400">{new Date(offer.createdAt).toLocaleString()}</p>
                                </div>
                                {offer.status === OfferStatus.PENDING ? (
                                    <button onClick={() => onAccept(offer.id)} className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Accept</button>
                                ) : (
                                    <span className={`px-2 py-1 text-xs font-bold rounded ${offer.status === OfferStatus.ACCEPTED ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{offer.status}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Close</button>
                </div>
            </div>
        </div>
    );
}

const CommoditexDashboard: React.FC<CommoditexDashboardProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [offerListing, setOfferListing] = useState<CommodityListingModel | null>(null);
    const [viewOffersListing, setViewOffersListing] = useState<CommodityListingModel | null>(null);

    const listings = useQuery(useMemo(() => database.get<CommodityListingModel>('commodity_listings').query(Q.sortBy('created_at', 'desc')), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);

    const handleCreateListing = async (data: any) => {
        await database.write(async () => {
            await database.get<CommodityListingModel>('commodity_listings').create(l => {
                l.farmerId = data.farmerId;
                l.cropName = data.cropName;
                l.qualityGrade = data.qualityGrade;
                l.quantity = parseFloat(data.quantity);
                l.unit = data.unit;
                l.askPrice = parseFloat(data.askPrice);
                l.status = ListingStatus.Active;
                l.tenantId = currentUser.tenantId;
                l.createdAt = new Date(); // Ensure creation date
            });
        });
        setIsCreateModalOpen(false);
    };

    const handlePlaceOffer = async (price: number, buyerName: string, contact: string) => {
        if (!offerListing) return;
        try {
            await database.write(async () => {
                await database.get<CommodityOfferModel>('commodity_offers').create(o => {
                    o.listingId = offerListing.id;
                    o.buyerName = buyerName;
                    o.buyerContact = contact;
                    o.offerPrice = price;
                    o.status = OfferStatus.PENDING;
                    o.createdAt = new Date();
                });
            });
            alert("Offer placed successfully!");
            setOfferListing(null);
        } catch (e) {
            console.error(e);
            alert("Failed to place offer.");
        }
    };

    const handleAcceptOffer = async (offerId: string) => {
        if(!viewOffersListing) return;
        if(!confirm("Accepting this offer will mark the listing as Booked. Proceed?")) return;
        
        const listingId = (viewOffersListing as any).id;

        try {
            await database.write(async () => {
                const offer = await database.get<CommodityOfferModel>('commodity_offers').find(offerId);
                await offer.update(o => { o.status = OfferStatus.ACCEPTED; });
                
                const listing = await database.get<CommodityListingModel>('commodity_listings').find(listingId);
                await listing.update(l => { l.status = ListingStatus.BidAccepted; });
            });
            alert("Offer accepted! Please proceed to offline settlement.");
            setViewOffersListing(null);
        } catch(e) {
            console.error(e);
            alert("Failed to accept offer.");
        }
    };
    
    const handleMarkSold = async (listing: CommodityListingModel) => {
        if(!confirm("Confirm that payment has been received and goods delivered?")) return;
        try {
            await database.write(async () => {
                const listingToUpdate = await database.get<CommodityListingModel>('commodity_listings').find((listing as any).id);
                await listingToUpdate.update(l => { l.status = ListingStatus.Sold; });
            });
        } catch (e) {
            console.error("Failed to mark sold", e);
        }
    }

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            Hapsara Commoditex
                        </h1>
                        <p className="text-gray-500">Farmer-Led Commodity Exchange & Fair Price Discovery</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setIsCreateModalOpen(true)} className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-md transition flex items-center gap-2">
                            <span>+</span> New Listing
                        </button>
                        <button onClick={onBack} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                            Back
                        </button>
                    </div>
                </div>

                {/* Market Tickers */}
                <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    <MarketTicker crop="Oil Palm" price={14500} trend={getPriceTrend('Oil Palm')} />
                    <MarketTicker crop="Paddy" price={2200} trend={getPriceTrend('Paddy')} />
                    <MarketTicker crop="Maize" price={1950} trend={getPriceTrend('Maize')} />
                    <MarketTicker crop="Cotton" price={6800} trend={getPriceTrend('Cotton')} />
                    <MarketTicker crop="Chilli" price={18000} trend={getPriceTrend('Chilli')} />
                </div>

                {/* Listings */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                        <h2 className="text-xl font-bold text-gray-800">Live Listings</h2>
                        <span className="text-sm text-gray-500">{listings.length} Active Lots</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ask Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {listings.map(listing => {
                                    const farmer = farmerMap.get(listing.farmerId);
                                    const formattedDate = listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'N/A';
                                    const isSold = listing.status === ListingStatus.Sold;
                                    const isBooked = listing.status === ListingStatus.BidAccepted;

                                    return (
                                        <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-800">{listing.cropName}</div>
                                                <div className="text-xs text-gray-400">{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {farmer?.fullName || 'Unknown'}
                                                <div className="text-xs text-gray-400">{farmer ? `${getGeoName('mandal', farmerModelToPlain(farmer)!)}` : ''}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 font-semibold">{listing.quantity} {listing.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${listing.qualityGrade === 'Grade A+' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                                    {listing.qualityGrade}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(listing.askPrice)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded border text-xs font-bold ${isSold ? 'bg-gray-200 text-gray-600' : isBooked ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{listing.status}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                                {listing.status === ListingStatus.Active && (
                                                    <>
                                                        <button onClick={() => setOfferListing(listing)} className="text-blue-600 hover:underline font-semibold">Bid</button>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => setViewOffersListing(listing)} className="text-gray-600 hover:text-gray-900 font-semibold">Manage</button>
                                                    </>
                                                )}
                                                {isBooked && (
                                                     <button onClick={() => handleMarkSold(listing)} className="text-green-600 hover:underline font-semibold">Mark Paid</button>
                                                )}
                                                {isSold && <span className="text-gray-400">Closed</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {listings.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-20 text-gray-400">No active listings. Create one to get started.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isCreateModalOpen && (
                <CreateListingModal 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onSave={handleCreateListing}
                    farmers={farmers}
                    currentUser={currentUser}
                />
            )}
            {offerListing && (
                <MakeOfferModal 
                    onClose={() => setOfferListing(null)}
                    listing={offerListing}
                    onOffer={handlePlaceOffer}
                />
            )}
            {viewOffersListing && (
                <ViewOffersModal 
                    onClose={() => setViewOffersListing(null)}
                    listing={viewOffersListing}
                    onAccept={handleAcceptOffer}
                />
            )}
        </div>
    );
};

export default CommoditexDashboard;
