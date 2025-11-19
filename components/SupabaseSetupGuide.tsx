import React, { useState } from 'react';

interface SupabaseSetupGuideProps {
    onClose: () => void;
}

const CodeBlock = ({ code }: { code: string }) => (
    <div className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto font-mono text-sm border border-gray-700">
        <pre>{code}</pre>
    </div>
);

const SupabaseSetupGuide: React.FC<SupabaseSetupGuideProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'auth' | 'helpers' | 'core_rls' | 'general_rls' | 'advanced_rls' | 'protection' | 'legacy' | 'realty' | 'audit'>('auth');

    const legacySchemaCode = `-- Legacy Schema PlaceHolder`;
    const realtySchemaCode = `
-- Create tables for Hapsara Realty (Land Exchange)

-- 1. Land Listings
CREATE TABLE public.land_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_plot_id UUID REFERENCES public.farm_plots(id),
    farmer_id UUID REFERENCES public.farmers(id),
    listing_type TEXT NOT NULL, -- 'LEASE'
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING_VERIFICATION', 'LEASED', 'WITHDRAWN'
    
    -- Valuation Inputs
    soil_organic_carbon NUMERIC,
    water_table_depth NUMERIC,
    road_access TEXT,
    avg_yield_history NUMERIC,
    hapsara_value_score NUMERIC, -- The calculated score
    
    -- Commercials
    ask_price NUMERIC,
    duration_months INTEGER,
    available_from DATE,
    description TEXT,
    
    tenant_id UUID, -- For RLS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Valuation History (Audit Trail)
CREATE TABLE public.land_valuation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.land_listings(id) ON DELETE CASCADE,
    score NUMERIC,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    factors_json JSONB -- Store snapshot of inputs used
);
    `;

    const generalTenantPolicies = `-- General Tenant Policies Placeholder`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[65]">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex text-white overflow-hidden">
                <div className="w-1/4 border-r border-gray-700 p-4 space-y-2 overflow-y-auto">
                    <button onClick={() => setActiveTab('auth')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'auth' ? 'bg-green-600/20 text-green-300' : 'hover:bg-gray-700'}`}>1. Auth & Helpers</button>
                    <button onClick={() => setActiveTab('legacy')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'legacy' ? 'bg-green-600/20 text-green-300' : 'hover:bg-gray-700'}`}>5. Legacy Schema</button>
                    <button onClick={() => setActiveTab('realty')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'realty' ? 'bg-green-600/20 text-green-300' : 'hover:bg-gray-700'}`}>6. Realty Schema (New)</button>
                    <button onClick={() => setActiveTab('general_rls')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'general_rls' ? 'bg-green-600/20 text-green-300' : 'hover:bg-gray-700'}`}>7. General Tenant Policies</button>
                </div>

                <div className="w-3/4 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Supabase Setup Guide</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">Close</button>
                    </div>

                    {activeTab === 'auth' && <div className="space-y-4"><p>Auth setup guide...</p></div>}
                    {activeTab === 'legacy' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">Legacy Module Schema (Social Mobility)</h3>
                            <p>Creates the necessary tables for managing farmer families and educational pathways.</p>
                            <p className="text-yellow-400 text-sm">Note: After running this, please run the "General Tenant Policies" script to apply security rules to these new tables.</p>
                            <CodeBlock code={legacySchemaCode} />
                        </div>
                    )}
                    {activeTab === 'realty' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">Realty Module Schema (Land Exchange)</h3>
                            <p>Creates tables for Land Listings and Valuation History.</p>
                            <p className="text-yellow-400 text-sm">Note: After running this, please run the "General Tenant Policies" script to apply security rules to these new tables.</p>
                            <CodeBlock code={realtySchemaCode} />
                        </div>
                    )}
                    {activeTab === 'general_rls' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">General Tenant Isolation Policies</h3>
                            <p>This script applies a standard, secure RLS policy to over 20 tables that have a `tenant_id` column. It ensures users can only access data from their own organization.</p>
                            <CodeBlock code={generalTenantPolicies} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupabaseSetupGuide;