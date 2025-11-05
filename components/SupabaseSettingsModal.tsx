import React, { useState } from 'react';

interface SupabaseSettingsModalProps {
    onSave: (url: string, key: string) => void;
}

const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({ onSave }) => {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');

    const handleSave = () => {
        if (url.trim() && key.trim()) {
            onSave(url.trim(), key.trim());
        } else {
            alert('Both Supabase URL and Anon Key are required.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect to Supabase</h2>
                    <p className="text-gray-600 mb-6">
                        Please enter your Supabase project URL and public anon key to get started. These will be saved locally in your browser.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700">Project URL</label>
                            <input
                                type="text"
                                id="supabaseUrl"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://<your-project-id>.supabase.co"
                                className="mt-1 w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="supabaseKey" className="block text-sm font-medium text-gray-700">Public Anon Key</label>
                            <input
                                type="text"
                                id="supabaseKey"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="eyJ..."
                                className="mt-1 w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">
                        Save and Connect
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupabaseSettingsModal;