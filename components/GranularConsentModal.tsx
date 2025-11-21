
import React, { useState, useEffect, useMemo } from 'react';
import { Farmer, DataSharingDataType } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { TerritoryModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { getGeoName } from '../lib/utils';

interface GranularConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (consentData: any) => void;
    farmer: Farmer;
    tenant: { id: string, name: string };
    existingConsent?: any;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void, label: string, description?: string, disabled?: boolean }> = ({ checked, onChange, label, description, disabled }) => (
    <button 
        type="button" 
        onClick={() => !disabled && onChange(!checked)} 
        className={`flex justify-between items-center p-3 border rounded-lg w-full transition-colors ${checked ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50 border-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-pressed={checked}
        disabled={disabled}
    >
        <div className="text-left">
            <span className={`font-semibold text-sm ${checked ? 'text-green-900' : 'text-gray-800'}`}>{label}</span>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`}>
            <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </div>
    </button>
);

const GranularConsentModal: React.FC<GranularConsentModalProps> = ({ isOpen, onClose, onSave, farmer, tenant, existingConsent }) => {
    const database = useDatabase();
    
    // 1. Find what services this Tenant offers in the Farmer's location
    // We need to match Farmer's location codes to Territory administrative codes
    const farmerAdminCode = `${farmer.district}-${farmer.mandal}`;
    
    const availableServices = useQuery(useMemo(() => 
        database.get<TerritoryModel>('territories').query(
            Q.where('tenant_id', tenant.id),
            Q.where('administrative_code', farmerAdminCode)
        ), 
    [database, tenant.id, farmerAdminCode]));

    const [consents, setConsents] = useState<Record<string, boolean>>({
        [DataSharingDataType.PERSONAL_INFO]: false,
        [DataSharingDataType.FINANCIALS]: false,
        [DataSharingDataType.CROP_DATA]: false,
    });
    
    const [serviceConsents, setServiceConsents] = useState<Record<string, boolean>>({});
    const [expiryDuration, setExpiryDuration] = useState('6_MONTHS');

    useEffect(() => {
        if (existingConsent) {
           setConsents({
               [DataSharingDataType.PERSONAL_INFO]: !!existingConsent[DataSharingDataType.PERSONAL_INFO],
               [DataSharingDataType.FINANCIALS]: !!existingConsent[DataSharingDataType.FINANCIALS],
               [DataSharingDataType.CROP_DATA]: !!existingConsent[DataSharingDataType.CROP_DATA],
           });
           
           // Parse Service Consents from existing data if available
           // Assuming existingConsent might have a 'services' key in future, or we parse from permissionsJson
           if (existingConsent.services) {
               const servicesMap: Record<string, boolean> = {};
               existingConsent.services.forEach((s: string) => servicesMap[s] = true);
               setServiceConsents(servicesMap);
           }
        }
    }, [existingConsent]);

    const handleDataToggle = (type: string) => {
        setConsents(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleServiceToggle = (serviceType: string) => {
        setServiceConsents(prev => ({ ...prev, [serviceType]: !prev[serviceType] }));
    };
    
    const handleSave = () => {
        // Calculate expiry date
        const now = new Date();
        if (expiryDuration === '3_MONTHS') now.setMonth(now.getMonth() + 3);
        else if (expiryDuration === '6_MONTHS') now.setMonth(now.getMonth() + 6);
        else if (expiryDuration === '1_YEAR') now.setFullYear(now.getFullYear() + 1);
        else if (expiryDuration === 'FOREVER') now.setFullYear(now.getFullYear() + 99);

        // Combine consents
        const activeServices = Object.entries(serviceConsents)
            .filter(([_, isActive]) => isActive)
            .map(([service]) => service);

        onSave({
            ...consents,
            services: activeServices,
            consentExpiry: now.toISOString()
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border-t-4 border-indigo-600" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Service & Data Contract</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Agreement between Farmer <strong>{farmer.fullName}</strong> and Tenant <strong>{tenant.name}</strong>.
                    </p>
                    <div className="mt-2 flex gap-2">
                        <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-700">{getGeoName('mandal', farmer)} Mandal</span>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    
                    {/* Section 1: Service Authorization */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            1. Authorize Services
                            <span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Jurisdictional Check</span>
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                            {tenant.name} has requested to provide the following services in your area. Select which ones you accept.
                        </p>
                        
                        <div className="space-y-2">
                            {availableServices.length > 0 ? availableServices.map(terr => (
                                <ToggleSwitch 
                                    key={terr.id}
                                    checked={!!serviceConsents[terr.serviceType]} 
                                    onChange={() => handleServiceToggle(terr.serviceType)}
                                    label={terr.serviceType.replace('_', ' ')}
                                    description={`Allow ${tenant.name} to operate as your ${terr.serviceType.toLowerCase().replace('_', ' ')} provider.`}
                                />
                            )) : (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                                    This tenant has no active service claims in {getGeoName('mandal', farmer)}. They cannot offer services here.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Data Permissions */}
                    <div>
                        <h4 className="font-bold text-gray-800 mb-3">2. Data Access Permissions</h4>
                        <div className="space-y-2">
                            <ToggleSwitch 
                                checked={consents[DataSharingDataType.PERSONAL_INFO]} 
                                onChange={() => handleDataToggle(DataSharingDataType.PERSONAL_INFO)}
                                label="Personal Identity"
                                description="Name, Phone, Address for KYC & Contact."
                            />
                            <ToggleSwitch 
                                checked={consents[DataSharingDataType.FINANCIALS]} 
                                onChange={() => handleDataToggle(DataSharingDataType.FINANCIALS)}
                                label="Financial History"
                                description="Subsidies, Wallet Balance, Credit Score."
                            />
                            <ToggleSwitch 
                                checked={consents[DataSharingDataType.CROP_DATA]} 
                                onChange={() => handleDataToggle(DataSharingDataType.CROP_DATA)}
                                label="Agronomic Data"
                                description="Crop cycles, Harvest logs, Soil health data."
                            />
                        </div>
                    </div>
                    
                    {/* Section 3: Duration */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-2 text-sm">3. Contract Duration</h4>
                        <CustomSelect 
                            value={expiryDuration} 
                            onChange={setExpiryDuration} 
                            options={[
                                {value: '3_MONTHS', label: '1 Season (3 Months)'},
                                {value: '6_MONTHS', label: '2 Seasons (6 Months)'},
                                {value: '1_YEAR', label: '1 Year'},
                                {value: 'FOREVER', label: 'Indefinite (Until Revoked)'}
                            ]} 
                        />
                        <p className="text-xs text-indigo-700 mt-2">
                            This agreement automically expires. You remain the owner of your data.
                        </p>
                    </div>
                </div>

                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-xl flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold shadow-sm">Sign Contract</button>
                </div>
            </div>
        </div>
    );
};

export default GranularConsentModal;
