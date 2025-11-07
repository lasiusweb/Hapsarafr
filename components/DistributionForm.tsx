import React, { useState } from 'react';
import { Resource } from '../types';
import { ResourceModel } from '../db';
import CustomSelect from './CustomSelect';

interface DistributionFormProps {
    onClose: () => void;
    onSubmit: (data: { resourceId: string, quantity: number, distributionDate: string, notes: string }) => Promise<void>;
    resources: ResourceModel[];
}

const DistributionForm: React.FC<DistributionFormProps> = ({ onClose, onSubmit, resources }) => {
    const [formData, setFormData] = useState({
        resourceId: '',
        quantity: '',
        distributionDate: new Date().toISOString().split('T')[0],
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const quantity = parseFloat(formData.quantity);
        if (!formData.resourceId) {
            alert('Please select a resource.');
            return;
        }
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
    
    const resourceOptions = resources.map(r => ({ value: r.id, label: `${r.name} (${r.unit})` }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Distribute Resource</h2>
                </div>
                <div className="p-8 space-y-4">
                    <div>
                        <label htmlFor="resourceId" className="block text-sm font-medium text-gray-700">Resource</label>
                        <CustomSelect
                            value={formData.resourceId}
                            onChange={(value) => setFormData(prev => ({ ...prev, resourceId: value }))}
                            options={resourceOptions}
                            placeholder="-- Select a resource --"
                        />
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="distributionDate" className="block text-sm font-medium text-gray-700">Distribution Date</label>
                        <input type="date" id="distributionDate" name="distributionDate" value={formData.distributionDate} onChange={handleChange} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : 'Record Distribution'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DistributionForm;