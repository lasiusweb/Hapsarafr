
import React, { useState, useEffect } from 'react';
import { FarmPlot, SoilType, PlantationMethod, PlantType } from '../types';
import { FarmPlotModel } from '../db';
import CustomSelect from './CustomSelect';

interface PlotFormModalProps {
    onClose: () => void;
    onSubmit: (data: any, mode: 'create' | 'edit') => Promise<void>;
    plot?: FarmPlotModel | null;
}

const PlotFormModal: React.FC<PlotFormModalProps> = ({ onClose, onSubmit, plot }) => {
    const isEditMode = !!plot;
    const [formData, setFormData] = useState({
        name: '',
        acreage: '',
        soilType: SoilType.Loamy,
        methodOfPlantation: PlantationMethod.Square,
        plantType: PlantType.Imported,
        plantationDate: '',
        isReplanting: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (plot) {
            setFormData({
                name: plot.name,
                acreage: String(plot.acreage),
                soilType: (plot.soilType as SoilType) || SoilType.Loamy,
                methodOfPlantation: (plot.methodOfPlantation as PlantationMethod) || PlantationMethod.Square,
                plantType: (plot.plantType as PlantType) || PlantType.Imported,
                plantationDate: plot.plantationDate || '',
                isReplanting: plot.isReplanting || false
            });
        } else {
            setFormData(prev => ({...prev, name: `Plot ${new Date().getTime().toString().slice(-4)}`}));
        }
    }, [plot]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const acreage = parseFloat(formData.acreage);
        if (isNaN(acreage) || acreage <= 0) {
            alert('Please enter a valid acreage.');
            return;
        }
        if (!formData.name) {
            alert('Plot name is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                ...formData,
                acreage
            }, isEditMode ? 'edit' : 'create');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Edit Farm Plot' : 'Add New Farm Plot'}</h2>
                </div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plot Name/Identifier</label>
                        <input name="name" value={formData.name} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., North Field, Survey 102" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Acreage</label>
                        <input type="number" step="0.01" name="acreage" value={formData.acreage} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Soil Type</label>
                            <CustomSelect 
                                value={formData.soilType} 
                                onChange={v => setFormData(prev => ({...prev, soilType: v as SoilType}))} 
                                options={Object.values(SoilType).map(t => ({value: t, label: t}))} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Plantation Date</label>
                            <input type="date" name="plantationDate" value={formData.plantationDate} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Method</label>
                            <CustomSelect 
                                value={formData.methodOfPlantation} 
                                onChange={v => setFormData(prev => ({...prev, methodOfPlantation: v as PlantationMethod}))} 
                                options={Object.values(PlantationMethod).map(t => ({value: t, label: t}))} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Plant Type</label>
                            <CustomSelect 
                                value={formData.plantType} 
                                onChange={v => setFormData(prev => ({...prev, plantType: v as PlantType}))} 
                                options={Object.values(PlantType).map(t => ({value: t, label: t}))} 
                            />
                        </div>
                    </div>
                     <div className="flex items-center">
                        <input id="isReplanting" type="checkbox" name="isReplanting" checked={formData.isReplanting} onChange={handleChange} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                        <label htmlFor="isReplanting" className="ml-2 block text-sm text-gray-900">Is this a Replanting?</label>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : 'Save Plot'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlotFormModal;
