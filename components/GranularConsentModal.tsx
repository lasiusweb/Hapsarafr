import React, { useState, useMemo, useEffect } from 'react';
import { Farmer } from '../types';

// Mock data for the prototype, representing crop diversity
const CROP_CATEGORIES: Record<string, string[]> = {
    'Grains': ['Paddy', 'Maize'],
    'Commercial Crops': ['Cotton', 'Groundnut'],
    'Spices': ['Chilli'],
};
const ALL_CROPS = Object.values(CROP_CATEGORIES).flat();

interface GranularConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (consentData: any) => void;
    farmer: Farmer;
    tenant: { id: string, name: string };
    existingConsent?: any;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button type="button" onClick={() => onChange(!checked)} className={`${checked ? 'bg-green-600' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`} role="switch" aria-checked={checked}>
        <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
    </button>
);

const GranularConsentModal: React.FC<GranularConsentModalProps> = ({ isOpen, onClose, onSave, farmer, tenant, existingConsent }) => {
    const [personalInfo, setPersonalInfo] = useState(false);
    const [financialInfo, setFinancialInfo] = useState(false);
    const [cropDataMode, setCropDataMode] = useState<'simple' | 'advanced'>('simple');
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedCrops, setSelectedCrops] = useState<Set<string>>(new Set());
    
    useEffect(() => {
        if (existingConsent) {
            setPersonalInfo(existingConsent.personalInfo || false);
            setFinancialInfo(existingConsent.financialInfo || false);
            if(existingConsent.cropData) {
                setCropDataMode(existingConsent.cropData.mode || 'simple');
                setSelectedCategories(new Set(existingConsent.cropData.categories || []));
                setSelectedCrops(new Set(existingConsent.cropData.crops || []));
            }
        }
    }, [existingConsent]);
    
    const handleCategoryToggle = (category: string) => {
        const newCategories = new Set(selectedCategories);
        let newCrops = new Set(selectedCrops);
        if (newCategories.has(category)) {
            newCategories.delete(category);
            CROP_CATEGORIES[category].forEach(crop => newCrops.delete(crop));
        } else {
            newCategories.add(category);
            CROP_CATEGORIES[category].forEach(crop => newCrops.add(crop));
        }
        setSelectedCategories(newCategories);
        setSelectedCrops(newCrops);
    };

    const handleCropToggle = (crop: string) => {
        const newCrops = new Set(selectedCrops);
        if (newCrops.has(crop)) {
            newCrops.delete(crop);
        } else {
            newCrops.add(crop);
        }
        setSelectedCrops(newCrops);
    };
    
    const handleSave = () => {
        const consentData = {
            personalInfo,
            financialInfo,
            cropData: {
                mode: cropDataMode,
                categories: Array.from(selectedCategories),
                crops: Array.from(selectedCrops)
            }
        };
        onSave(consentData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Manage Data Sharing</h2>
                    <p className="text-sm text-gray-500 mt-1">For {farmer.fullName} with <span className="font-semibold">{tenant.name}</span></p>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <p><strong>Prototype Notice:</strong> This is a UI prototype for gathering feedback on granular consent. The settings here are not yet saved to the database.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 border rounded-lg">
                            <div><h4 className="font-semibold text-gray-700">Personal Information</h4><p className="text-xs text-gray-500">Includes name, contact details, and address.</p></div>
                            <ToggleSwitch checked={personalInfo} onChange={setPersonalInfo} />
                        </div>
                        <div className="flex justify-between items-center p-4 border rounded-lg">
                            <div><h4 className="font-semibold text-gray-700">Financial Information</h4><p className="text-xs text-gray-500">Includes subsidy records and wallet transactions.</p></div>
                            <ToggleSwitch checked={financialInfo} onChange={setFinancialInfo} />
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                            <div><h4 className="font-semibold text-gray-700">Crop Data</h4><p className="text-xs text-gray-500">Activity and harvest data for non-oil palm crops.</p></div>
                             <div className="flex items-center gap-2 text-sm">
                                <button onClick={() => setCropDataMode('simple')} className={`px-2 py-1 rounded-md ${cropDataMode === 'simple' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Simple</button>
                                <button onClick={() => setCropDataMode('advanced')} className={`px-2 py-1 rounded-md ${cropDataMode === 'advanced' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Advanced</button>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            {cropDataMode === 'simple' ? (
                                <div className="space-y-3">
                                    {Object.keys(CROP_CATEGORIES).map(category => (
                                        <div key={category} className="flex justify-between items-center">
                                            <span className="text-gray-800">{category}</span>
                                            <ToggleSwitch checked={selectedCategories.has(category)} onChange={() => handleCategoryToggle(category)} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {ALL_CROPS.map(crop => (
                                        <div key={crop} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                            <span className="text-gray-800">{crop}</span>
                                            <ToggleSwitch checked={selectedCrops.has(crop)} onChange={() => handleCropToggle(crop)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">Save Settings</button>
                </div>
            </div>
        </div>
    );
};

export default GranularConsentModal;