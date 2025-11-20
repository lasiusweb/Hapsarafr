
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
    const [activeTab, setActiveTab] = useState<'sovereignty' | 'auth' | 'fortis_rls' | 'indexes'>('sovereignty');

    const fortisRlsCode = `
-- HAPSARA FORTIS: Advanced Security Policies

-- 0. Create Helper Table for Territory Mapping
-- This table links users to specific mandals/districts
CREATE TABLE IF NOT EXISTS user_territories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL, -- Map to your auth user ID
  administrative_code text NOT NULL, -- e.g., "DistrictID-MandalID"
  tenant_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for fast RLS lookups
CREATE INDEX idx_user_territories_user ON user_territories(user_id);

-- 1. Enable RLS on all core tables
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsidy_payments ENABLE ROW LEVEL SECURITY;

-- 2. Create a secure function to check territory access
-- This prevents complex joins in every RLS policy
CREATE OR REPLACE FUNCTION public.has_territory_access(_mandal_id text)
RETURNS boolean AS $$
BEGIN
  -- Admins have access to everything in their tenant (Logic simplified for SQL example)
  -- NOTE: In production, check JWT role claims here
  
  -- Field officers check their assigned territories
  RETURN EXISTS (
    SELECT 1 FROM user_territories
    WHERE user_id = auth.uid()
    AND administrative_code LIKE '%' || _mandal_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply the Fortis Policy (Example: Farmers)
-- Note: Requires 'tenant_id' claim in JWT for optimal performance
CREATE POLICY "Fortis_Tenant_Isolation" ON farmers
FOR ALL USING (
  -- 1. Tenant Isolation
  tenant_id = (auth.jwt() ->> 'tenant_id')
  AND
  (
     -- 2. Role Check (simplified) - Admin access vs Field Officer Access
     (auth.jwt() ->> 'role' = 'admin')
     OR
     -- 3. Territory Check
     public.has_territory_access(mandal)
  )
);
`;

    const indexingCode = `
-- HAPSARA FORTIS: Performance Indexing
-- Critical for syncing 10k+ records on mobile devices

-- 1. Sync Index (Crucial for WatermelonDB pullChanges)
CREATE INDEX idx_farmers_updated_at ON farmers(updated_at);
CREATE INDEX idx_plots_updated_at ON farm_plots(updated_at);

-- 2. Tenant Partitioning Index
CREATE INDEX idx_farmers_tenant ON farmers(tenant_id);

-- 3. Geo-Lookup Index
CREATE INDEX idx_farmers_geo ON farmers(district, mandal, village);
`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[65]">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex text-white overflow-hidden">
                <div className="w-1/4 border-r border-gray-700 p-4 space-y-2 overflow-y-auto">
                    <button onClick={() => setActiveTab('sovereignty')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'sovereignty' ? 'bg-red-900/40 text-red-200 border border-red-800' : 'hover:bg-gray-700'}`}>1. Data Sovereignty 🇮🇳</button>
                    <button onClick={() => setActiveTab('fortis_rls')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'fortis_rls' ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-gray-700'}`}>2. Fortis Security Core</button>
                    <button onClick={() => setActiveTab('indexes')} className={`w-full text-left p-3 rounded-md font-semibold text-sm transition-colors ${activeTab === 'indexes' ? 'bg-green-600/20 text-green-300' : 'hover:bg-gray-700'}`}>3. Performance Tuning</button>
                </div>

                <div className="w-3/4 p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Hapsara Fortis Setup</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">Close</button>
                    </div>

                    {activeTab === 'sovereignty' && (
                        <div className="space-y-6">
                            <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg">
                                <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Step 0: Mandatory Compliance
                                </h3>
                                <p className="mt-2 text-gray-300">
                                    To comply with India's <strong>DPDP Act (2023)</strong>, you must ensure all data is stored within Indian borders.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black p-4 rounded border border-gray-700">
                                    <p className="text-gray-400 text-sm uppercase mb-1">Cloud Provider</p>
                                    <p className="font-bold text-lg">AWS (via Supabase)</p>
                                </div>
                                <div className="bg-black p-4 rounded border border-green-700">
                                    <p className="text-green-400 text-sm uppercase mb-1">Required Region</p>
                                    <p className="font-bold text-lg text-white">ap-south-1 (Mumbai)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fortis_rls' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">The Fortis Security Model</h3>
                            <p className="text-gray-300 text-sm">
                                Unlike standard RLS which just checks ID, Fortis checks <strong>Territory Assignments</strong>. This ensures a Field Officer in Warangal cannot access data from Mulugu, even within the same Tenant organization.
                            </p>
                            <CodeBlock code={fortisRlsCode} />
                        </div>
                    )}

                    {activeTab === 'indexes' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white">High-Performance Sync Indexes</h3>
                            <p className="text-gray-300 text-sm">
                                WatermelonDB relies heavily on the <code>updated_at</code> column to determine what data to pull. Without these indexes, sync performance will degrade exponentially as your dataset grows.
                            </p>
                            <CodeBlock code={indexingCode} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupabaseSetupGuide;
