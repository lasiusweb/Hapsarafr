
import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { TenantPartnerConfigModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User } from '../types';

interface TenantPartnerSettingsModalProps {
    onClose: () => void;
    currentUser: User;
}

const CATEGORIES = ['FERTILIZER', 'PESTICIDE', 'EQUIPMENT', 'FINANCE', 'INSURANCE', 'SEEDS'];

const TenantPartnerSettingsModal: React.FC<TenantPartnerSettingsModalProps> = ({ onClose, currentUser }) => {
    const database = useDatabase();
    const [configModel, setConfigModel] = useState<TenantPartnerConfigModel | null>(null);
    const [isRevenueShareEnabled, setIsRevenueShareEnabled] = useState(false);
    const [blockedCategories, setBlockedCategories] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            const configs = await database.get<TenantPartnerConfigModel>('tenant_partner_configs')
                .query(Q.where('tenant_id', currentUser.tenantId)).fetch();
            
            if (configs.length > 0) {
                const config = configs[0];
                setConfigModel(config);
                setIsRevenueShareEnabled(config.revenueShareEnabled);
                try {
                    const blocked = JSON.parse(config.blockedCategoriesJson || '[]');
                    setBlockedCategories(new Set(blocked));
                } catch (e) {
                    console.error("Error parsing blocked categories", e);
                }
            }
        };
        fetchConfig();
    }, [database, currentUser.tenantId]);

    const handleCategoryToggle = (category: string) => {
        setBlockedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) newSet.delete(category);
            else newSet.add(category);
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await database.write(async () => {
                if (configModel) {
                    await configModel.update(c => {
                        c.revenueShareEnabled = isRevenueShareEnabled;
                        c.blockedCategoriesJson = JSON.stringify(Array.from(blockedCategories));
                        c.syncStatus = 'pending';
                    });
                } else {
                    await database.get<TenantPartnerConfigModel>('tenant_partner_configs').create(c => {
                        c.tenantId = currentUser.tenantId;
                        c.revenueShareEnabled = isRevenueShareEnabled;
                        c.blockedCategoriesJson = JSON.stringify(Array.from(blockedCategories));
                        c.syncStatus = 'pending';
                    });
                }
            });
            alert("Settings saved successfully.");
            onClose();
        } catch (e) {
            console.error("Failed to save settings:", e);
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-gray-800">Partner Ecosystem Settings</h2>
                    <p className="text-sm text-gray-500">Control which partners are visible to your farmers.</p>
                </div>
                <div className="p-8 space-y-6">
                    
                    {/* Revenue Share Toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                            <h3 className="font-bold text-blue-900">Enable Revenue Sharing</h3>
                            <p className="text-xs text-blue-700 mt-1">Earn 3-5% commission on sales made by partners to your farmers.</p>
                        </div>
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="toggle" id="toggle" checked={isRevenueShareEnabled} onChange={e => setIsRevenueShareEnabled(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-green-400"/>
                            <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${isRevenueShareEnabled ? 'bg-green-400' : 'bg-gray-300'}`}></label>
                        </div>
                    </div>

                    {/* Category Blocking */}
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Blocked Categories</h3>
                        <p className="text-sm text-gray-500 mb-4">Prevent partners in these categories from appearing to your farmers. Use this to avoid conflicts of interest.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => (
                                <label key={cat} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${blockedCategories.has(cat) ? 'bg-red-50 border-red-200' : 'bg-white hover:bg-gray-50'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={blockedCategories.has(cat)} 
                                        onChange={() => handleCategoryToggle(cat)} 
                                        className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                    />
                                    <span className={`ml-2 text-sm font-medium ${blockedCategories.has(cat) ? 'text-red-800' : 'text-gray-700'}`}>{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
            <style>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #68D391;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #68D391;
                }
            `}</style>
        </div>
    );
};

export default TenantPartnerSettingsModal;
