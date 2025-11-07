import React, { useState } from 'react';
import SupabaseSetupGuide from './SupabaseSetupGuide';

// For CDN Supabase library
declare const window: any;

interface SupabaseSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: () => void;
}

const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({ isOpen, onClose, onConnect }) => {
    const [url, setUrl] = useState(localStorage.getItem('supabaseUrl') || '');
    const [anonKey, setAnonKey] = useState(localStorage.getItem('supabaseAnonKey') || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    const isConnected = !!(localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseAnonKey'));

    const handleTestAndSave = async () => {
        setIsLoading(true);
        setError(null);
        setStatus('Testing connection...');

        if (!url || !anonKey) {
            setError('URL and Anon Key are required.');
            setIsLoading(false);
            return;
        }

        try {
            const { createClient } = window.supabase;
            if (!createClient) {
                throw new Error('Supabase client library not found. Please check your internet connection and page setup.');
            }
            const testClient = createClient(url, anonKey);
            
            // Test query to check if connection and RLS are working at a basic level
            const { error: queryError } = await testClient
                .from('farmers')
                .select('id', { count: 'exact', head: true });

            if (queryError) {
                if (queryError.message.includes('fetch')) {
                    throw new Error(`Network error. Please check the Project URL and your internet connection.`);
                }
                if (queryError.code === '42501' || queryError.message.includes('rls')) {
                    // This error is okay, it means RLS is enabled but we can't access the table.
                    // The connection itself is likely valid.
                } else if (queryError.message.includes('relation "public.farmers" does not exist')) {
                     throw new Error(`Connection successful, but the 'farmers' table was not found. Have you run the initial database setup?`);
                } else {
                    throw new Error(`API Error: ${queryError.message}. Check your Anon Key.`);
                }
            }

            // If we reach here, the connection is valid
            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseAnonKey', anonKey);
            onConnect();
            setStatus('Connection successful! Settings saved.');
            setTimeout(onClose, 1500);

        } catch (e: any) {
            setError(e.message);
            setStatus('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = () => {
        if (window.confirm('Are you sure you want to disconnect? This will disable cloud sync.')) {
            localStorage.removeItem('supabaseUrl');
            localStorage.removeItem('supabaseAnonKey');
            setUrl('');
            setAnonKey('');
            onConnect(); // Re-initialize supabase to null
            onClose();
        }
    };
    
    if (!isOpen) return null;
    
    if (showSetupGuide) {
        return <SupabaseSetupGuide onClose={() => setShowSetupGuide(false)} />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Cloud Sync Settings</h2>
                    <p className="text-gray-500 text-sm mt-1">Connect to a Supabase project to enable cloud sync and analytics.</p>
                </div>
                <div className="p-8 space-y-4">
                    {isConnected && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                            <p className="font-semibold text-green-800">Connected</p>
                            <p className="text-sm text-green-700 truncate">Project: {localStorage.getItem('supabaseUrl')}</p>
                        </div>
                    )}
                    <div>
                        <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700">Supabase Project URL</label>
                        <input type="url" id="supabaseUrl" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-project-ref.supabase.co" className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="supabaseAnonKey" className="block text-sm font-medium text-gray-700">Supabase Anon (public) Key</label>
                        <input type="text" id="supabaseAnonKey" value={anonKey} onChange={e => setAnonKey(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    
                    <div className="text-sm text-gray-500">
                        Need to set up your Supabase project? Follow our{' '}
                        <button onClick={() => setShowSetupGuide(true)} className="text-green-600 font-semibold hover:underline">
                            Backend Setup Guide
                        </button>.
                    </div>

                    {(error || status) && (
                        <div className={`p-3 rounded-md text-sm text-center ${error ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            {error || status}
                        </div>
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-between items-center rounded-b-lg">
                    {isConnected ? (
                        <button type="button" onClick={handleDisconnect} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold">
                            Disconnect
                        </button>
                    ) : (
                        <div></div> // Placeholder for alignment
                    )}
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="button" onClick={handleTestAndSave} disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-green-300">
                            {isLoading ? 'Testing...' : 'Test & Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupabaseSettingsModal;