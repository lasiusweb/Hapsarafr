import React, { useState } from 'react';
import SupabaseFunctionCreator from './SupabaseFunctionCreator';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-900 text-white p-4 rounded-md text-xs relative my-2">
            <pre><code>{code.trim()}</code></pre>
            <button 
                onClick={copyToClipboard} 
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
            >
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
};

const setupSteps = [
    {
        title: "Resetting Your Schema (Optional)",
        content: (
            <>
                <p>If you are re-running this setup guide or have encountered errors like <code className="bg-gray-700 px-1 rounded text-red-400">relation "farmers" already exists</code> or <code className="bg-gray-700 px-1 rounded text-red-400">policy ... already exists</code>, it means some parts of the database are already configured. To start fresh, you must first delete the old configuration.</p>
                <div className="my-3 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm">
                    <strong>Warning:</strong> The following script will <strong className="font-bold">permanently delete</strong> all data from the `farmers`, `profiles`, `groups`, and `invitations` tables. Use this only if you want a complete reset.
                </div>
                <p>Run this script in the <strong className="text-gray-200">SQL Editor</strong> before proceeding to Step 2.</p>
                <CodeBlock code={`
-- Step 1: Drop the Authentication Trigger from the 'auth.users' table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the function that the trigger uses
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();

-- Step 3: Drop the tables. The order is important due to relationships.
-- Dropping a table also automatically removes its policies.
DROP TABLE IF EXISTS public.farmers;
DROP TABLE IF EXISTS public.invitations;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.groups;
                `} />
            </>
        )
    },
    {
        title: "Create Supabase Project",
        content: (
            <>
                <p>First, you'll need a Supabase project. If you don't have one, visit <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Supabase's website</a> to create one. The free tier is sufficient to get started.</p>
                <p className="mt-2">Once your project is created, navigate to the <strong className="text-gray-200">Project Settings &gt; API</strong> section. You will need the <strong className="text-gray-200">Project URL</strong> and the <strong className="text-gray-200">public anon key</strong> to connect the application.</p>
            </>
        )
    },
    {
        title: "Create Database Tables & Default Data",
        content: (
            <>
                <p>Go to the <strong className="text-gray-200">SQL Editor</strong> in your Supabase dashboard and run the following single SQL script. It will create all the necessary tables with the correct relationships and insert the default user groups.</p>
                <CodeBlock code={`
-- Step 2.1: Create Groups table (must be first due to foreign keys)
CREATE TABLE public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions JSONB
);

-- Step 2.2: Create Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  group_id TEXT REFERENCES public.groups(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2.3: Create Invitations table
CREATE TABLE public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    email_for TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',
    accepted_by_user_id UUID REFERENCES auth.users(id)
);

-- Step 2.4: Create Farmers table
CREATE TABLE public.farmers (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  father_husband_name TEXT,
  aadhaar_number TEXT UNIQUE,
  mobile_number TEXT,
  gender TEXT,
  address TEXT,
  ppb_rofr_id TEXT,
  photo TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  account_verified BOOLEAN,
  applied_extent NUMERIC,
  approved_extent NUMERIC,
  number_of_plants INTEGER,
  method_of_plantation TEXT,
  plant_type TEXT,
  plantation_date TEXT,
  mlrd_plants INTEGER,
  full_cost_plants INTEGER,
  application_id TEXT UNIQUE,
  farmer_id TEXT UNIQUE,
  proposed_year TEXT,
  registration_date TEXT,
  aso_id TEXT,
  payment_utr_dd TEXT,
  status TEXT,
  district TEXT,
  mandal TEXT,
  village TEXT,
  sync_status TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Step 2.5: Insert Default Group Data
INSERT INTO public.groups (id, name, permissions) VALUES
('group-admin', 'Administrator', '["CAN_REGISTER_FARMER", "CAN_EDIT_FARMER", "CAN_DELETE_FARMER", "CAN_IMPORT_DATA", "CAN_EXPORT_DATA", "CAN_SYNC_DATA", "CAN_MANAGE_USERS", "CAN_MANAGE_GROUPS", "CAN_INVITE_USERS"]'),
('group-data-entry', 'Data Entry Operator', '["CAN_REGISTER_FARMER", "CAN_EDIT_FARMER", "CAN_IMPORT_DATA", "CAN_EXPORT_DATA", "CAN_SYNC_DATA"]'),
('group-viewer', 'Viewer', '["CAN_EXPORT_DATA"]');
                `} />
                 <div className="my-3 p-3 bg-blue-900/50 border border-blue-700 rounded-md text-blue-300 text-sm">
                    <strong>For Existing Setups:</strong> If you've already set up the `farmers` table, run the following commands to add any missing columns. Using `IF NOT EXISTS` is safe to run multiple times.
                    <CodeBlock code={`
-- Add user tracking columns (if not present)
ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
                    `} />
                </div>
            </>
        )
    },
    {
        title: "Enable Row Level Security (RLS)",
        content: (
            <>
                <p>RLS is crucial for securing your data. These policies provide a secure starting point. Run these queries in the <strong className="text-gray-200">SQL Editor</strong>.</p>
                <h4 className="font-semibold mt-4 text-gray-200">1. Create Admin Checker Function</h4>
                <p>This helper function checks if the currently logged-in user is part of the 'Administrator' group. This is essential for creating secure policies. Run this in the <strong className="text-gray-200">SQL Editor</strong>.</p>
                <CodeBlock code={`
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND group_id = 'group-admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`} />

                <h4 className="font-semibold mt-4 text-gray-200">2. Enable RLS and Create Policies</h4>
                <p>Run these queries in the <strong className="text-gray-200">SQL Editor</strong>. They enable RLS and set up secure access rules.</p>

                <CodeBlock code={`
-- Enable RLS for all tables
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR 'farmers'
-- Policy: Authenticated users can perform all actions on farmers.
-- Note: This is a permissive policy for getting started. In production, you should
-- create more granular policies based on user roles. The app's UI already enforces 
-- this, but database-level security is always recommended for production.
CREATE POLICY "Allow authenticated users to manage farmers"
ON public.farmers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICIES FOR 'profiles'
CREATE POLICY "Allow users to view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow admins to manage all profiles" ON public.profiles
FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- POLICIES FOR 'groups'
CREATE POLICY "Allow authenticated users to read groups" ON public.groups
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admins to manage groups" ON public.groups
FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- POLICIES FOR 'invitations'
CREATE POLICY "Allow public read-only access" ON public.invitations
FOR SELECT USING (true);
CREATE POLICY "Allow admins to manage invitations" ON public.invitations
FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
                `} />
            </>
        )
    },
    {
        title: "Create User Profile Automation",
        content: (
            <>
                <p>This final backend step is the most critical. We'll create a database <strong className="text-green-300">function</strong> and a <strong className="text-green-300">trigger</strong> that work together to automatically create a profile for new users when they sign up. Follow the steps in the interactive panel below.</p>
                <SupabaseFunctionCreator />
            </>
        )
    },
    {
        title: "Connect the Application",
        content: (
            <>
                <p>Your Supabase backend is now fully configured! The application is pre-configured to automatically connect using the Supabase Project URL and anon key.</p>
                <p className="mt-2">Simply close this guide and log in or sign up to begin using the application. All data will now be synchronized with your new Supabase project.</p>
            </>
        )
    }
];

const SupabaseSetupGuide: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div
                className="bg-gray-800 text-gray-300 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">Supabase Setup Guide</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-grow p-6 overflow-y-auto space-y-8">
                    {setupSteps.map((step, index) => (
                        <section key={index}>
                            <h3 className="text-2xl font-bold text-green-400 mb-3">{`Step ${index}: ${step.title}`}</h3>
                            <div className="prose prose-invert prose-sm max-w-none prose-a:text-green-400 prose-strong:text-gray-200">
                                {step.content}
                            </div>
                        </section>
                    ))}
                </div>
                <div className="bg-gray-900 p-4 flex justify-end gap-4 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupabaseSetupGuide;