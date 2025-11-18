import React, { useState, useMemo, useEffect } from 'react';
import { Farmer, DataSharingDataType } from '../types';

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
    const [consents, setConsents] = useState<Record<DataSharingDataType, boolean>>({
        [DataSharingDataType.PERSONAL_INFO]: false,
        [DataSharingDataType.FINANCIALS]: false,
        [DataSharingDataType.CROP_DATA]: false,
    });
    
    useEffect(() => {
        if (existingConsent) {
           setConsents({
               [DataSharingDataType.PERSONAL_INFO]: !!existingConsent[DataSharingDataType.PERSONAL_INFO],
               [DataSharingDataType.FINANCIALS]: !!existingConsent[DataSharingDataType.FINANCIALS],
               [DataSharingDataType.CROP_DATA]: !!existingConsent[DataSharingDataType.CROP_DATA],
           })
        }
    }, [existingConsent]);

    const handleToggle = (type: DataSharingDataType) => {
        setConsents(prev => ({ ...prev, [type]: !prev[type] }));
    };
    
    const handleSave = () => {
        onSave(consents);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Manage Data Sharing</h2>
                    <p className="text-sm text-gray-500 mt-1">For {farmer.fullName} with <span className="font-semibold">{tenant.name}</span></p>
                </div>

                <div className="p-8 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                            <h4 className="font-semibold text-gray-700">Personal Information</h4>
                            <p className="text-xs text-gray-500">Includes name, contact details, and address.</p>
                        </div>
                        <ToggleSwitch checked={consents[DataSharingDataType.PERSONAL_INFO]} onChange={() => handleToggle(DataSharingDataType.PERSONAL_INFO)} />
                    </div>
                     <div className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                            <h4 className="font-semibold text-gray-700">Financial Information</h4>
                            <p className="text-xs text-gray-500">Includes subsidy records and wallet transactions.</p>
                        </div>
                        <ToggleSwitch checked={consents[DataSharingDataType.FINANCIALS]} onChange={() => handleToggle(DataSharingDataType.FINANCIALS)} />
                    </div>
                     <div className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                            <h4 className="font-semibold text-gray-700">Crop & Harvest Data</h4>
                            <p className="text-xs text-gray-500">Includes plot details, crop types, and harvest logs.</p>
                        </div>
                        <ToggleSwitch checked={consents[DataSharingDataType.CROP_DATA]} onChange={() => handleToggle(DataSharingDataType.CROP_DATA)} />
                    </div>
                    {consents[DataSharingDataType.CROP_DATA] && (
                        <div className="p-4 border-l-4 border-blue-300 bg-blue-50 rounded-r-lg">
                            <h5 className="font-semibold text-blue-800">Advanced Crop Data Selection</h5>
                            <p className="text-xs text-blue-700">Coming soon: You'll be able to select specific farm plots to share.</p>
                        </div>
                    )}
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
