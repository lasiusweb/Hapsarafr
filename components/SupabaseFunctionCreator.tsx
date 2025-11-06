import React, { useState } from 'react';

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

const SupabaseFunctionCreator: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'function' | 'trigger'>('function');
    
    const functionCode = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, group_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    -- Use group_id from metadata if present (from invitation), otherwise default
    COALESCE(NEW.raw_user_meta_data->>'group_id', 'group-data-entry')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const triggerCode = `
-- First, drop the old trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then, create the new trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
    `;

    return (
        <div className="bg-gray-700/50 rounded-lg p-4 my-4">
            <div className="flex border-b border-gray-600">
                <button onClick={() => setActiveTab('function')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'function' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}>1. Create Function</button>
                <button onClick={() => setActiveTab('trigger')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'trigger' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'}`}>2. Create Trigger</button>
            </div>
            <div className="pt-4 min-h-[200px]">
                {activeTab === 'function' && (
                    <div>
                        <p>This database function automatically creates a public profile for a new user when they sign up. Run this code in the <strong className="text-gray-200">SQL Editor</strong>.</p>
                        <p className="text-sm mt-1 text-yellow-300">Note: This single script both creates the function and sets its security, so you don't need to do it manually in the UI.</p>
                        <CodeBlock code={functionCode} />
                    </div>
                )}
                {activeTab === 'trigger' && (
                    <div>
                        <p>This trigger automatically runs the function you just created whenever a new user is added to the authentication system. Run this in the <strong className="text-gray-200">SQL Editor</strong>.</p>
                        
                        <div className="my-3 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm">
                            <h4 className="font-bold text-red-200">Important: Use the SQL Editor</h4>
                            <p className="mt-1">You <strong className="font-semibold">must</strong> run the script below in the SQL Editor. Do not use the "Create a trigger" button in the Supabase UI.</p>
                            <p className="mt-2">
                                <strong>Why?</strong> The required table, <code className="bg-gray-800 text-sm px-1 rounded">auth.users</code>, will not appear in the UI dropdown because it is in a protected schema. The SQL script correctly targets this table and will work as intended.
                            </p>
                        </div>

                        <CodeBlock code={triggerCode} />
                         <div className="my-3 p-3 bg-blue-900/50 border border-blue-700 rounded-md text-blue-300 text-sm">
                            <strong>Tip:</strong> The script includes a line to drop any existing trigger with the same name. This prevents errors if you need to run the script more than once.
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600">
                <h4 className="font-semibold text-gray-200">3. How to Verify Your Setup</h4>
                <p className="text-sm mt-2">The easiest way to confirm everything is working is to use the app:</p>
                <ol className="list-decimal list-inside text-sm space-y-1 mt-2 text-gray-400">
                    <li>Close this guide.</li>
                    <li>Sign out if you are currently logged in.</li>
                    <li>Create a brand new account using the 'Sign Up' link on the login page.</li>
                    <li>Check your email for the confirmation link and click it.</li>
                    <li>Log in with your new account.</li>
                    <li>If you can log in and see the dashboard, your setup is successful! If not, please double-check that you ran the scripts from both tabs above.</li>
                </ol>
            </div>
        </div>
    );
};

export default SupabaseFunctionCreator;