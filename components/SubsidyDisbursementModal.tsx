import React, { useState, useMemo, useEffect } from 'react';
import { Farmer, PaymentStage } from '../types';
import CustomSelect from './CustomSelect';

const STAGE_AMOUNT_MAP: Partial<Record<PaymentStage, number>> = {
  [PaymentStage.MaintenanceYear1]: 5250,
  [PaymentStage.MaintenanceYear2]: 5250,
  [PaymentStage.MaintenanceYear3]: 5250,
  [PaymentStage.MaintenanceYear4]: 5250,
  [PaymentStage.IntercroppingYear1]: 5250,
  [PaymentStage.IntercroppingYear2]: 5250,
  [PaymentStage.IntercroppingYear3]: 5250,
  [PaymentStage.IntercroppingYear4]: 5250,
  [PaymentStage.PlantingMaterialDomestic]: 20000,
  [PaymentStage.PlantingMaterialImported]: 29000,
  [PaymentStage.BoreWell]: 50000,
  [PaymentStage.VermiCompost]: 15000,
  [PaymentStage.Replanting]: 250, // Per plant, but let's use a placeholder for now
  [PaymentStage.Fertilizer]: 5000, // Example value
  [PaymentStage.Other]: 0,
};

interface SubsidyDisbursementModalProps {
    onClose: () => void;
    onSave: (data: { farmers: Farmer[], stage: PaymentStage, amount: number, notes: string }) => Promise<void>;
    allFarmers: Farmer[];
}

const SubsidyDisbursementModal: React.FC<SubsidyDisbursementModalProps> = ({ onClose, onSave, allFarmers }) => {
    const [stage, setStage] = useState<PaymentStage>(PaymentStage.MaintenanceYear1);
    const [amount, setAmount] = useState<string>(String(STAGE_AMOUNT_MAP[PaymentStage.MaintenanceYear1] || ''));
    const [notes, setNotes] = useState('');
    const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setAmount(String(STAGE_AMOUNT_MAP[stage] || ''));
    }, [stage]);

    const filteredFarmers = useMemo(() => {
        if (!searchTerm) return allFarmers;
        const lowercasedQuery = searchTerm.toLowerCase();
        return allFarmers.filter(f => 
            f.fullName.toLowerCase().includes(lowercasedQuery) ||
            f.hap_id?.toLowerCase().includes(lowercasedQuery)
        );
    }, [allFarmers, searchTerm]);

    const handleToggleFarmer = (farmerId: string) => {
        setSelectedFarmerIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(farmerId)) newSet.delete(farmerId);
            else newSet.add(farmerId);
            return newSet;
        });
    };

    const handleToggleAll = () => {
        const allVisibleIds = new Set(filteredFarmers.map(f => f.id));
        const currentSelection = new Set(selectedFarmerIds);
        
        // Check if all filtered farmers are already selected
        let allSelected = true;
        for (const id of allVisibleIds) {
            if (!currentSelection.has(id)) {
                allSelected = false;
                break;
            }
        }

        if (allSelected) {
            // Deselect all visible
            allVisibleIds.forEach(id => currentSelection.delete(id));
        } else {
            // Select all visible
            allVisibleIds.forEach(id => currentSelection.add(id));
        }
        setSelectedFarmerIds(currentSelection);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (selectedFarmerIds.size === 0 || isNaN(numericAmount) || numericAmount <= 0) {
            alert('Please select at least one farmer and enter a valid amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedFarmers = allFarmers.filter(f => selectedFarmerIds.has(f.id));
            await onSave({ farmers: selectedFarmers, stage, amount: numericAmount, notes });
        } finally {
            setIsSubmitting(false);
        }
    };

    const paymentStageOptions = Object.values(PaymentStage).map(s => ({ value: s, label: s }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-full">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Disburse Subsidy to Wallets</h2></div>
                <div className="p-8 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Subsidy Type / Stage</label>
                            <CustomSelect value={stage} onChange={(v) => setStage(v as PaymentStage)} options={paymentStageOptions} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount per Farmer (₹)</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes / Description (Optional)</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder={`e.g., Annual Maintenance for ${new Date().getFullYear()}`} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                    </div>

                    <div className="pt-4">
                        <label className="block text-sm font-medium text-gray-700">Select Farmers ({selectedFarmerIds.size} selected)</label>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search farmers by name or HAP ID..." className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                        
                        <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                            <div className="p-2 border-b bg-gray-50 flex items-center">
                                <input type="checkbox" onChange={handleToggleAll} checked={filteredFarmers.length > 0 && Array.from(selectedFarmerIds).filter(id => filteredFarmers.some(f => f.id === id)).length === filteredFarmers.length} className="h-4 w-4 text-green-600 border-gray-300 rounded mr-3" />
                                <label className="text-sm font-medium text-gray-700">Select All ({filteredFarmers.length})</label>
                            </div>
                            {filteredFarmers.map(farmer => (
                                <div key={farmer.id} className="flex items-center p-3 border-b last:border-0 hover:bg-gray-50">
                                    <input type="checkbox" checked={selectedFarmerIds.has(farmer.id)} onChange={() => handleToggleFarmer(farmer.id)} className="h-4 w-4 text-green-600 border-gray-300 rounded mr-3" />
                                    <div>
                                        <p className="font-medium text-gray-800">{farmer.fullName}</p>
                                        <p className="text-xs text-gray-500 font-mono">{farmer.hap_id || 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting || selectedFarmerIds.size === 0} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Disbursing...' : `Disburse to ${selectedFarmerIds.size} Farmer(s)`}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SubsidyDisbursementModal;