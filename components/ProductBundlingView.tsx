
import React from 'react';
import { BundleOpportunity } from '../lib/businessIntelligence';

interface ProductBundlingViewProps {
    bundles: BundleOpportunity[];
}

const BundleCard: React.FC<{ bundle: BundleOpportunity }> = ({ bundle }) => {
    const handleCreatePromo = () => {
        const productNames = bundle.products.map(p => p.name).join(' + ');
        if (confirm(`Create a promo for "${productNames}" with ${bundle.suggestedDiscount}% discount?`)) {
            alert("Promo Created! Sent to active customer list.");
        }
    };

    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-blue-100 flex flex-col justify-between h-full transition-all hover:shadow-md">
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded uppercase tracking-wider">Smart Bundle</span>
                    {bundle.frequency > 0 && <span className="text-xs text-gray-500 font-medium">{bundle.frequency} purchases together</span>}
                </div>
                
                <div className="flex items-center justify-center gap-4 my-4">
                    {bundle.products.map((p, idx) => (
                        <React.Fragment key={p.id}>
                            <div className="text-center w-24">
                                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-xl shadow-inner mb-2">
                                    {/* Simple initial or icon fallback */}
                                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full rounded-full object-cover" /> : '📦'}
                                </div>
                                <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                            </div>
                            {idx < bundle.products.length - 1 && <span className="text-xl text-gray-400 font-bold">+</span>}
                        </React.Fragment>
                    ))}
                </div>

                <p className="text-sm text-gray-600 italic text-center px-2 mb-4">"{bundle.description}"</p>
            </div>

            <button 
                onClick={handleCreatePromo}
                className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md font-semibold text-sm hover:from-blue-600 hover:to-indigo-700 shadow-sm flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Create Promo ({bundle.suggestedDiscount}% Off)
            </button>
        </div>
    );
};

const ProductBundlingView: React.FC<ProductBundlingViewProps> = ({ bundles }) => {
    if (bundles.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">Merchandising Intelligence</h2>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">AI</span>
            </div>
            <p className="text-sm text-gray-500">Frequently bought items identified from your sales history.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundles.map(bundle => (
                    <BundleCard key={bundle.id} bundle={bundle} />
                ))}
            </div>
        </div>
    );
};

export default ProductBundlingView;
