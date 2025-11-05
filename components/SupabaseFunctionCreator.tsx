import React, { useState } from 'react';

interface SupabaseFunctionCreatorProps {
    onClose: () => void;
}

const SQL_DEFINITION = `begin
  insert into public.profiles (id, full_name, avatar_url, group_id, subscription_tier)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'group-data-entry', -- Assigns a default group to new users
    new.raw_user_meta_data->>'subscription_tier'
  );
  return new;
end;`;

const SupabaseFunctionCreator: React.FC<SupabaseFunctionCreatorProps> = ({ onClose }) => {
    const [showSuccess, setShowSuccess] = useState(false);

    const handleConfirm = () => {
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClose();
        }, 2000);
    };

    const inputClass = "mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-200";
    const labelClass = "block text-sm font-medium text-gray-400";
    const descriptionClass = "mt-1 text-xs text-gray-500";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div 
                className="bg-gray-800 text-gray-300 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Create a new function</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-grow flex overflow-hidden">
                    {/* Main Form Area */}
                    <div className="w-2/3 p-6 space-y-4 overflow-y-auto">
                        <div>
                            <label htmlFor="func-name" className={labelClass}>Name of function</label>
                            <input id="func-name" type="text" value="handle_new_user" readOnly className={inputClass} />
                            <p className={descriptionClass}>This will be the name you use to call the function.</p>
                        </div>
                        <div>
                            <label htmlFor="func-schema" className={labelClass}>Schema</label>
                            <input id="func-schema" type="text" value="public" readOnly className={inputClass} />
                            <p className={descriptionClass}>The schema this function belongs to.</p>
                        </div>
                         <div>
                            <label htmlFor="func-return" className={labelClass}>Return type</label>
                            <input id="func-return" type="text" value="trigger" readOnly className={inputClass} />
                            <p className={descriptionClass}>The data type that this function will return. Choose 'trigger' for functions that respond to auth events.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Arguments</label>
                            <div className="mt-1 p-4 bg-gray-900 border border-gray-600 rounded-md text-center text-gray-500 text-sm">
                                This function does not require any arguments.
                            </div>
                        </div>
                         <div>
                            <label htmlFor="func-def" className={labelClass}>Definition</label>
                            <textarea id="func-def" readOnly value={SQL_DEFINITION} rows={12} className={`${inputClass} font-mono text-xs`}></textarea>
                            <p className={descriptionClass}>The code that will be executed when the function is called. This part is wrapped in `$$`.</p>
                        </div>
                        
                        {/* Advanced Settings */}
                        <details className="pt-2">
                            <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white">Advanced Settings</summary>
                             <div className="mt-4 p-4 border border-gray-700 rounded-md space-y-4 bg-gray-900/50">
                                <div>
                                    <label className={labelClass}>Security of definer</label>
                                     <div className="mt-1 flex items-center gap-3 p-2 border border-green-500 bg-gray-700 rounded-md">
                                        <div className="relative">
                                            <input type="checkbox" checked readOnly className="sr-only peer"/>
                                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </div>
                                        <span className="font-semibold text-white">ON</span>
                                    </div>
                                    <p className={descriptionClass}>When ON, the function runs with the permissions of its creator, allowing it to access tables the calling user may not have permission for (like `auth.users`).</p>
                                </div>
                                 <div>
                                    <label htmlFor="func-lang" className={labelClass}>Function language</label>
                                    <input id="func-lang" type="text" value="plpgsql" readOnly className={inputClass} />
                                     <p className={descriptionClass}>The language the function is written in.</p>
                                </div>
                                 <div>
                                    <label htmlFor="func-path" className={labelClass}>Search path</label>
                                    <input id="func-path" type="text" value="public" readOnly className={inputClass} />
                                     <p className={descriptionClass}>Sets the schema search order. `public` is standard for accessing your tables.</p>
                                </div>
                            </div>
                        </details>
                    </div>

                    {/* Templates Sidebar */}
                    <div className="w-1/3 p-6 bg-gray-900 border-l border-gray-700 overflow-y-auto">
                        <h3 className="font-semibold text-gray-200">Templates</h3>
                        <p className="text-sm text-gray-400 mb-4">Select a template to quickly get started.</p>
                        <div className="space-y-2">
                             <div className="p-3 border-2 border-green-500 bg-gray-700 rounded-lg cursor-pointer">
                                <h4 className="font-bold text-white">User Management Starter</h4>
                                <p className="text-xs text-gray-300">Creates a `handle_new_user` function to automatically copy new users from `auth.users` to a public `profiles` table.</p>
                            </div>
                            <div className="p-3 border border-gray-600 hover:border-gray-500 rounded-lg cursor-not-allowed opacity-50">
                                <h4 className="font-bold text-gray-400">Get User Claims</h4>
                                <p className="text-xs text-gray-500">A security definer function to get a user's claims.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition font-semibold">Cancel</button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold w-28 text-center">
                        {showSuccess ? (
                            <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupabaseFunctionCreator;
