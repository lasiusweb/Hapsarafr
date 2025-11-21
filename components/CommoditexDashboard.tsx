
import React, { useState, useMemo, useEffect } from 'react';
import { User, CommodityListing, ListingStatus, CommodityOffer, OfferStatus } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CommodityListingModel, FarmerModel, CommodityOfferModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { getFairPriceRange, getPriceTrend, PriceAnalysis, getDemandForecast, getBulkPremium } from '../lib/priceOracle';
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

const DemandForecastWidget: React.FC<{ crop: string; region: string }> = ({ crop, region }) => {
    const forecast = useMemo(() => getDemandForecast(crop, region), [crop, region]);
    
    return (
        <div className="bg-indigo-900 text-white p-4 rounded-lg shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
                <p className="text-xs text-indigo-200 uppercase font-bold flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Demand Forecast: {crop}
                </p>
                <p className="font-bold text-lg mt-1">
                    Expected to {forecast.trend === 'rising' ? 'Rise' : forecast.trend === 'falling' ? 'Fall' : 'Stabilize'} 
                    {forecast.trend !== 'stable' && ` by ${forecast.percentage}%`}
                </p>
                <p className="text-xs text-indigo-300 mt-1">{forecast.reason}</p>
            </div>
            <div className={`p-3 rounded-full shadow-lg ${forecast.trend === 'rising' ? 'bg-green-500' : forecast.trend === 'falling' ? 'bg-red-500' : 'bg-gray-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {forecast.trend === 'rising' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    ) : forecast.trend === 'falling' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                    )}
                </svg>
            </div>
        </div>
    );
};

// --- Aggregation Helper Component ---
const CommunityLotCard: React.FC<{ groupKey: string; listings: CommodityListingModel[]; totalQty: number; farmers: string[] }> = ({ groupKey, listings, totalQty, farmers }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const avgPrice = listings.reduce((sum, l) => sum + (l.askPrice * l.quantity), 0) / totalQty;
    const bulkPremium = getBulkPremium(totalQty, listings[0]?.cropName || '');
    const potentialValue = avgPrice * totalQty;
    const premiumValue = potentialValue * bulkPremium;

    const [mandal, village] = groupKey.split('|');

    return (
        <div className="border border-purple-200 rounded-lg bg-purple-50 overflow-hidden mb-4 transition-shadow hover:shadow-md">
            <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-200 p-2 rounded-lg text-purple-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 text-lg">Community Lot: {village}</h4>
                            <p className="text-xs text-gray-600">{mandal} • {listings[0]?.cropName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-purple-900">{totalQty.toFixed(1)} Tons</p>
                        <p className="text-xs text-purple-700 font-semibold">{farmers.length} Farmers Participating</p>
                    </div>
                </div>
                
                <div className="mt-3 flex gap-4 text-sm border-t border-purple-100 pt-2">
                    <div>Avg Ask: <strong>{formatCurrency(avgPrice)}/t</strong></div>
                    {premiumValue > 0 && (
                        <div className="text-green-700 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
                            Bulk Premium: +{formatCurrency(premiumValue)} ({(bulkPremium * 100).toFixed(1)}%)
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="bg-white border-t border-gray-200 p-4">
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Contributing Lots</h5>
                    <div className="space-y-2">
                        {listings.map(l => (
                            <div key={l.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <span>Farmer ID: ...{l.farmerId.slice(-6)}</span>
                                <div className="flex gap-4">
                                    <span>{l.quantity} t</span>
                                    <span className="font-mono">{formatCurrency(l.askPrice)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 transition text-sm">
                        Bid on Full Lot
                    </button>
                </div>
            )}
        </div>
    );
}

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
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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
    const [viewMode, setViewMode] = useState<'individual' | 'community'>('individual');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [offerListing, setOfferListing] = useState<CommodityListingModel | null>(null);
    const [viewOffersListing, setViewOffersListing] = useState<CommodityListingModel | null>(null);

    const listings = useQuery(useMemo(() => database.get<CommodityListingModel>('commodity_listings').query(Q.sortBy('created_at', 'desc')), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    
    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);

    // Group Listings for Community View
    const communityGroups = useMemo(() => {
        const groups: Record<string, { listings: CommodityListingModel[], totalQty: number, farmers: Set<string> }> = {};
        
        listings.filter(l => l.status === ListingStatus.Active).forEach(listing => {
            const farmer = farmerMap.get(listing.farmerId);
            if (!farmer) return;
            
            // Group key: Mandal|Village|Crop
            const key = `${farmer.mandal}|${farmer.village}|${listing.cropName}`;
            
            if (!groups[key]) {
                groups[key] = { listings: [], totalQty: 0, farmers: new Set() };
            }
            
            groups[key].listings.push(listing);
            groups[key].totalQty += listing.quantity; // Assuming tons for MVP sim
            groups[key].farmers.add(farmer.id);
        });

        // Only return groups with aggregation potential (e.g. > 1 listing or significant volume)
        return Object.entries(groups)
            .filter(([_, data]) => data.listings.length > 1 || data.totalQty > 5)
            .map(([key, data]) => ({ key, ...data, farmers: Array.from(data.farmers) }));
    }, [listings, farmerMap]);


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

    const recentTrades = useMemo(() => listings.filter(l => l.status === ListingStatus.Sold).slice(0, 5), [listings]);

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

                {/* Demand Forecast & Tickers */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-1">
                        <DemandForecastWidget crop="Oil Palm" region="Warangal" />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            <MarketTicker crop="Oil Palm" price={14500} trend={getPriceTrend('Oil Palm')} />
                            <MarketTicker crop="Paddy" price={2200} trend={getPriceTrend('Paddy')} />
                            <MarketTicker crop="Maize" price={1950} trend={getPriceTrend('Maize')} />
                            <MarketTicker crop="Cotton" price={6800} trend={getPriceTrend('Cotton')} />
                        </div>
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-4 mb-4 bg-white p-2 rounded-lg shadow-sm w-fit">
                    <button onClick={() => setViewMode('individual')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'individual' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}>Individual Listings</button>
                    <button onClick={() => setViewMode('community')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'community' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Community Lots
                    </button>
                </div>

                {viewMode === 'community' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {communityGroups.length > 0 ? communityGroups.map(group => (
                            <CommunityLotCard key={group.key} groupKey={group.key} listings={group.listings} totalQty={group.totalQty} farmers={group.farmers} />
                        )) : (
                            <div className="col-span-full text-center py-20 bg-white rounded-lg shadow-sm border border-dashed">
                                <p className="text-gray-500">No aggregated community lots available right now. Check back later or encourage neighbors to list together.</p>
                            </div>
                        )}
                    </div>
                ) : (
                /* Listings Table */
                <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-8">
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
                                    const isVirtualBatch = listing.quantity < 1 && listing.unit === 'tons'; // Visual indicator

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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 font-semibold">
                                                {listing.quantity} {listing.unit}
                                                {isVirtualBatch && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded border border-purple-200 font-bold">
                                                        V-BATCH
                                                    </span>
                                                )}
                                            </td>
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
                )}

                {/* Recent Trades */}
                {recentTrades.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Trades</h3>
                        <div className="flex flex-wrap gap-4">
                            {recentTrades.map(trade => (
                                <div key={trade.id} className="bg-white px-3 py-2 rounded border text-xs text-gray-600 shadow-sm flex items-center gap-2">
                                    <span className="font-bold text-green-700">SOLD</span>
                                    <span>{trade.cropName}</span>
                                    <span className="text-gray-400">|</span>
                                    <span>{trade.quantity} {trade.unit} @ {formatCurrency(trade.askPrice)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
