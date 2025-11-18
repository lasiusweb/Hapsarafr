import React, { useState } from 'react';
import { InputType } from '../types';
import CustomSelect from './CustomSelect';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

interface AgronomicInputModalProps {
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

const AgronomicInputModal: React.FC<AgronomicInputModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        input_date: new Date().toISOString().split('T')[0],
        input_type: InputType.Fertilizer,
        name: '',
        quantity: '',
        unit: 'kg',
        npk_values_json: '',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTypeChange = (type: InputType) => {
        let unit = 'kg';
        if (type === InputType.Irrigation) unit = 'hours';
        if (type === InputType.Pesticide) unit = 'litre';
        setFormData(prev => ({ ...prev, input_type: type, unit }));
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const quantity = parseFloat(formData.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({ ...formData, quantity });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const inputTypeOptions = Object.values(InputType).map(type => ({ value: type, label: type }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">Log Agronomic Input</h2></div>
                <div className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="input_date">Input Date</Label>
                            <Input type="date" id="input_date" name="input_date" value={formData.input_date} onChange={handleChange} required />
                        </div>
                        <div>
                            <Label>Input Type</Label>
                            <CustomSelect value={formData.input_type} onChange={v => handleTypeChange(v as InputType)} options={inputTypeOptions} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="name">Product Name / Description</Label>
                        <Input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder={formData.input_type === 'IRRIGATION' ? 'e.g., Drip Irrigation' : 'e.g., Urea'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input type="number" step="0.01" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required />
                        </div>
                        <div>
                            <Label htmlFor="unit">Unit</Label>
                            <Input type="text" id="unit" name="unit" value={formData.unit} onChange={handleChange} required />
                        </div>
                    </div>
                    {formData.input_type === InputType.Fertilizer && (
                         <div>
                            <Label htmlFor="npk_values_json">NPK Values (Optional)</Label>
                            <Input type="text" id="npk_values_json" name="npk_values_json" value={formData.npk_values_json} onChange={handleChange} placeholder='e.g., {"N": 46, "P": 0, "K": 0}' />
                            <p className="text-xs text-gray-500 mt-1">Enter as a JSON string if known.</p>
                        </div>
                    )}
                     <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2}></Textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : 'Log Input'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AgronomicInputModal;