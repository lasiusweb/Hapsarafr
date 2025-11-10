import React, { useState, useEffect } from 'react';
import { PlantingRecord } from '../types';
import CustomSelect from './CustomSelect';

interface PlantingRecordFormModalProps {
    onClose: () => void;
    onSubmit: (data: Partial<PlantingRecord>, mode: 'create' | 'edit') => Promise<void>;
    plotId: string;
    plantingRecord?: PlantingRecord | null;
}

const PlantingRecordFormModal: React.FC<PlantingRecordFormModalProps> = ({ onClose, onSubmit, plotId, plantingRecord }) => {
    const isEditMode = !!plantingRecord;
    const [formData, setFormData] = useState({
        seedSource: '',
        plantingDate: new Date().toISOString().split('T')[0],
        geneticVariety: '',
        numberOfPlants: '',
        careInstructionsUrl: '',
        qrCodeData: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEditMode && plantingRecord) {
            setFormData({
                seedSource: plantingRecord.seedSource,
                plantingDate: plantingRecord.plantingDate.split('T')[0],
                geneticVariety: plantingRecord.geneticVariety,
                numberOfPlants: String(plantingRecord.numberOfPlants),
                careInstructionsUrl: plantingRecord.careInstructionsUrl || '',
                qrCodeData: plantingRecord.qrCodeData || '',
            });
        }
    }, [isEditMode, plantingRecord]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit({
                id: plantingRecord?.id,
                plotId: plotId,
                ...formData,
                numberOfPlants: Number(formData.numberOfPlants),
            }, isEditMode ? 'edit' : 'create');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Planting Record' : 'Add New Planting Record'}</h2>
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Seed Source / Nursery *</label>
                        <input type="text" name="seedSource" value={formData.seedSource} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Genetic Variety *</label>
                        <input type="text" name="geneticVariety" value={formData.geneticVariety} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Tenera, Dura" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Number of Plants *</label>
                        <input type="number" name="numberOfPlants" value={formData.numberOfPlants} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Planting Date *</label>
                        <input type="date" name="plantingDate" value={formData.plantingDate} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Care Instructions URL (Optional)</label>
                        <input type="url" name="careInstructionsUrl" value={formData.careInstructionsUrl} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="https://example.com/care-guide" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Seedling QR Code Data (Optional)</label>
                        <div className="mt-1 flex gap-2">
                            <input type="text" name="qrCodeData" value={formData.qrCodeData} onChange={handleChange} className="flex-1 w-full p-2 border border-gray-300 rounded-md" placeholder="Enter or scan QR data" />
                            <button type="button" disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md font-semibold flex items-center gap-2 cursor-not-allowed" title="QR Scanner coming soon">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v2a1 1 0 11-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h3v2a1 1 0 102 0V4zm-6 8a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM9 9a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1H6a1 1 0 000 2h1v1a1 1 0 102 0v-2a1 1 0 00-1-1H9z" clipRule="evenodd" /><path d="M3 13a1 1 0 011-1h1v-1a1 1 0 112 0v1h2a1 1 0 110 2H8v1a1 1 0 11-2 0v-1H5a1 1 0 01-1-1v-1z" /><path fillRule="evenodd" d="M11 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 11-2 0V5h-2a1 1 0 01-1-1zM16 11a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM4 16a1 1 0 011-1h3a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                Scan
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : 'Save Record'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlantingRecordFormModal;
