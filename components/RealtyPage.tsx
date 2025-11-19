
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { LandListingModel, FarmerModel, FarmPlotModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User } from '../types';
import { formatCurrency, getGeoName, farmerModelToPlain } from '../lib/utils';
import { getHvsColor, getHvsGrade } from '../lib/valuation';

const CreateLandListingModal = lazy(() => import('./CreateLandListingModal'));

interface RealtyPageProps {
    onBack: () => void;
    currentUser: User;
}

const ListingCard: React.FC<{ listing: LandListingModel; farmer?: FarmerModel; plot?: FarmPlotModel }> = ({ listing, farmer, plot }) => {
    const plainFarmer = farmer ? farmerModelToPlain(farmer) : null;
    
    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-gray-800">{plot?.name || 'Farm Plot'}</h3>
                    <p className="text-xs text-gray-500">{plainFarmer ? `${getGeoName('village', plainFarmer)}, ${getGeoName('mandal', plainFarmer)}` : 'Location Unavailable'}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold border ${getHvsColor(listing.hapsaraValueScore)} border-current`}>
                    HVS {listing.hapsaraValueScore}
                </div>
            </div>
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-sm text-gray-500">Ask Rent</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(listing.askPrice)}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-semibold text-gray-800">{listing.durationMonths} mths</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <div>Yield: <strong>{listing.avgYieldHistory} t/ac</strong></div>
                    <div>Water: <strong>{listing.waterTableDepth} ft</strong></div>
                    <div className="col-span-2">Access: <strong>{listing.roadAccess.replace('_', ' ')}</strong></div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse"></span>
                    <span className="text-xs text-orange-600 font-medium">Social verification pending</span>
                </div>

                <button className="w-full py-2 mt-2 bg-amber-600 text-white rounded font-semibold hover:bg-amber-700 transition text-sm">
                    Contact Owner
                </button>
            </div>
        </div>
    );
};

const RealtyPage: React.FC<RealtyPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const listings = useQuery(useMemo(() => database.get<LandListingModel>('land_listings').query(Q.sortBy('created_at', Q.desc)), [database]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(), [database]));

    const farmerMap = useMemo(() => new Map(farmers.map(f => [f.id, f])), [farmers]);
    const plotMap = useMemo(() => new Map(plots.map(p => [p.id, p])), [plots]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            Hapsara Realty
                        </h1>
                        <p className="text-amber-700">The Transparent Agricultural Land Exchange.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsCreateModalOpen(true)} className="px-5 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 shadow-md transition">
                            + List My Land
                        </button>
                        <button onClick={onBack} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                            Back
                        </button>
                    </div>
                </div>

                {listings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {listings.map(listing => (
                            <ListingCard 
                                key={listing.id} 
                                listing={listing} 
                                farmer={farmerMap.get(listing.farmerId)}
                                plot={plotMap.get(listing.farmPlotId)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl shadow-md border border-gray-200">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">No Listings Yet</h3>
                        <p className="text-gray-500 mt-2">Be the first to list agricultural land for lease in your area.</p>
                    </div>
                )}

                <div className="mt-12 p-6 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="font-bold text-amber-900 mb-2">How Hapsara Value Score (HVS) works</h4>
                    <p className="text-sm text-amber-800">
                        We calculate the fair productive value of land based on <strong>Yield History</strong> (40%), <strong>Soil Quality</strong> (20%), <strong>Water Access</strong> (20%), and <strong>Logistics</strong> (20%). This ensures fair pricing based on agricultural potential, not speculation.
                    </p>
                </div>
            </div>
            
            {isCreateModalOpen && (
                <Suspense fallback={null}>
                    <CreateLandListingModal 
                        onClose={() => setIsCreateModalOpen(false)} 
                        currentUser={currentUser}
                        onSaveSuccess={() => {
                            // Refresh handled by observables
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default RealtyPage;
