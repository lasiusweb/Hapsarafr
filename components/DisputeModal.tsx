import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { TenantModel, DistrictModel, MandalModel, TerritoryDisputeModel } from '../db';
import { User, TerritoryDisputeStatus } from '../types';
import CustomSelect from './CustomSelect';
import { Q } from '@nozbe/watermelondb';

interface DisputeModalProps {
    onClose: () => void;
    onSave: () => void;
    currentUser: User;
}

const DisputeModal: React.FC<DisputeModalProps> = ({ onClose, onSave, currentUser }) => {
    const database = useDatabase();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [contestedTenantId, setContestedTenantId] = useState('');
    const [adminLevel, setAdminLevel] = useState<'DISTRICT' | 'MANDAL'>('MANDAL');
    const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
    const [selectedMandalCode, setSelectedMandalCode] = useState('');
    const [reason, setReason] = useState('');
    
    // Data Queries
    const tenants = useQuery(useMemo(() => database.get<TenantModel>('tenants').query(Q.where('id', Q.notEq(currentUser.tenantId))), [database, currentUser.tenantId]));
    const districts = useQuery(useMemo(() => database.get<DistrictModel>('districts').query(Q.sortBy('name')), [database]));
    const mandals = useQuery(useMemo(() => database.get<MandalModel>('mandals').query(), [database]));

    const tenantOptions = tenants.map(t => ({ value: t.id, label: t.name }));
    const districtOptions = districts.map(d => ({ value: d.code, label: d.name }));
    const mandalOptions = mandals
        .filter(m => districts.find(d => d.code === selectedDistrictCode)?.id === m.districtId)
        .map(m => ({ value: m.code, label: m.name }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const administrativeCode = adminLevel === 'MANDAL' ? `${selectedDistrictCode}-${selectedMandalCode}` : selectedDistrictCode;
        if (!contestedTenantId || !administrativeCode || (adminLevel === 'MANDAL' && !selectedMandalCode) || !reason) {
            alert('Please fill out all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<TerritoryDisputeModel>('territory_disputes').create(d => {
                    d.requestingTenantId = currentUser.tenantId;
                    d.contestedTenantId = contestedTenantId;
                    d.administrativeCode = administrativeCode;
                    d.reason = reason;
                    d.status = TerritoryDisputeStatus.Open;
                    d.syncStatusLocal = 'pending';
                });
            });
            onSave();
        } catch (error) {
            console.error("Failed to save dispute:", error);
            alert("An error occurred while saving the dispute.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Raise a New Territorial Dispute</h2></div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contested Tenant *</label>
                        <CustomSelect options={tenantOptions} value={contestedTenantId} onChange={setContestedTenantId} placeholder="-- Select a tenant --" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contested Area *</label>
                        <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <CustomSelect value={adminLevel} onChange={v => setAdminLevel(v as any)} options={[{value: 'DISTRICT', label: 'District'}, {value: 'MANDAL', label: 'Mandal'}]} />
                            <CustomSelect value={selectedDistrictCode} onChange={setSelectedDistrictCode} options={districtOptions} placeholder="-- Select District --" />
                            {adminLevel === 'MANDAL' && (
                                <CustomSelect value={selectedMandalCode} onChange={setSelectedMandalCode} options={mandalOptions} placeholder="-- Select Mandal --" disabled={!selectedDistrictCode} />
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Reason for Dispute *</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={4} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DisputeModal;
