
import React, { useState, useMemo } from 'react';
import { User, CommodityListing, ListingStatus } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { CommodityListingModel, FarmerModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { getFairPriceRange, getPriceTrend } from '../lib/priceOracle';
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

const CreateListingModal: React.FC<{ onClose: () => void; onSave: (data: any) => Promise<void>; farmers: FarmerModel[]; currentUser: User }> = ({ onClose, onSave, farmers, currentUser }) => {
    const [formState, setFormState] = useState({
        farmerId: '',
        cropName: 'Oil Palm',
        qualityGrade: 'Grade A',
        quantity: '',
        unit: 'tons',
        askPrice: '',
    });
    
    const [fairPrice, setFairPrice] = useState<{low: number, high: number, fair: number} | null>(null);

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: f.fullName })), [farmers]);
    
    const updateFairPrice = (crop: string, farmerId: string, quality: string) => {
        if (!farmerId) return;
        const farmer = farmers.find(f => f.id === farmerId);
        const district = farmer?.district || 'Warangal'; 
        // In real app, resolve district code to name
        const range = getFairPriceRange(crop, 'Warangal', quality); // Using hardcoded region for demo
        setFairPrice(range);
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Create Commodity Listing</h2></div>
                <div className="p-8 space-y-4">
                    <CustomSelect label="Farmer" options={farmerOptions} value={formState.farmerId} onChange={handleFarmerChange} />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Crop</label>
                            <select name="cropName" value={formState.cropName} onChange={handleChange} className="w-full p-2 border rounded-md mt-1">
                                <option>Oil Palm</option>
                                <option>Maize</option>
                                <option>Paddy</option>
                                <option>Cotton</option>
                                <option>Chilli</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Quality</label>
                            <select name="qualityGrade" value={formState.qualityGrade} onChange={handleChange} className="w-full p-2 border rounded-md mt-1">
                                <option>Grade A+</option>
                                <option>Grade A</option>
                                <option>Grade B</option>
                                <option>Grade C</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                        <p className="text-xs text-blue-800 font-bold uppercase mb-1">Fair Price Oracle</p>
                        {fairPrice ? (
                             <div className="flex justify-between items-center text-sm">
                                <span>Market Range:</span>
                                <span className="font-bold text-blue-700">{formatCurrency(fairPrice.low)} - {formatCurrency(fairPrice.high)}</span>
                             </div>
                        ) : <span className="text-xs text-gray-500">Select details to see fair price.</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <div className="flex gap-2">
                                <input name="quantity" type="number" value={formState.quantity} onChange={handleChange} required className="w-full p-2 border rounded-md mt-1" />
                                <select name="unit" value={formState.unit} onChange={handleChange} className="mt-1 border rounded-md bg-gray-50">
                                    <option>tons</option>
                                    <option>quintals</option>
                                    <option>kg</option>
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Ask Price (Total or Per Unit? Per Unit)</label>
                            <input name="askPrice" type="number" value={formState.askPrice} onChange={handleChange} required className="w-full p-2 border rounded-md mt-1" />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">List Commodity</button>
                </div>
            </form>
        </div>
    );
};

const CommoditexDashboard: React.FC<CommoditexDashboardProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
            });
        });
        setIsCreateModalOpen(false);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            Hapsara Commoditex
                        </h1>
                        <p className="text-gray-500">Farmer-Led Commodity Exchange</p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setIsCreateModalOpen(true)} className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-md transition">
                            + New Listing
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
                <div className="bg-white rounded-lg shadow-md">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Live Listings</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crop</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ask Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {listings.map(listing => {
                                    const farmer = farmerMap.get(listing.farmerId);
                                    return (
                                        <tr key={listing.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">{listing.cropName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{farmer?.fullName || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{listing.quantity} {listing.unit}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${listing.qualityGrade === 'Grade A+' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {listing.qualityGrade}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(listing.askPrice)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 text-xs font-bold">{listing.status}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button className="text-blue-600 hover:underline text-sm font-semibold">View Bids</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {listings.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-10 text-gray-500">No active listings. Create one to get started.</td></tr>
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
        </div>
    );
};

export default CommoditexDashboard;
