import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Farmer, User, OverallGrade, QualityStandard } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { QualityStandardModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';

interface HarvestFormProps {
    allFarmers: Farmer[];
    currentUser: User;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

const HarvestForm: React.FC<HarvestFormProps> = ({ allFarmers, currentUser, onClose, onSubmit }) => {
    const database = useDatabase();
    
    // Form State
    const [farmerId, setFarmerId] = useState('');
    const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
    const [grossWeight, setGrossWeight] = useState('');
    const [tareWeight, setTareWeight] = useState('');
    const [metricValues, setMetricValues] = useState<Record<string, string>>({});
    const [overallGrade, setOverallGrade] = useState<OverallGrade>(OverallGrade.GradeA);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data Loading
    const qualityStandards = useQuery(useMemo(() => database.get<QualityStandardModel>('quality_standards').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));

    const farmerOptions = useMemo(() => allFarmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.farmerId})` })), [allFarmers]);
    const netWeight = useMemo(() => {
        const gross = parseFloat(grossWeight);
        const tare = parseFloat(tareWeight);
        if (!isNaN(gross) && !isNaN(tare) && gross > tare) {
            return gross - tare;
        }
        return 0;
    }, [grossWeight, tareWeight]);

    const handleMetricChange = (metricName: string, value: string) => {
        setMetricValues(prev => ({ ...prev, [metricName]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmerId || netWeight <= 0) {
            alert('Please select a farmer and enter valid weights.');
            return;
        }
        
        setIsSubmitting(true);
        
        const data = {
            harvest: {
                farmerId,
                harvestDate,
                grossWeight: parseFloat(grossWeight),
                tareWeight: parseFloat(tareWeight),
                netWeight,
            },
            assessment: {
                overallGrade,
                notes,
            },
            metrics: Object.entries(metricValues).map(([metricName, metricValue]) => ({
                metricName,
                metricValue,
            })),
        };
        
        await onSubmit(data);
        setIsSubmitting(false);
    };

    const renderMetricInput = (standard: QualityStandardModel) => {
        const { metricName, measurementUnit } = standard;
        const value = metricValues[metricName] || '';

        if (measurementUnit === '%') {
            return <input type="number" value={value} onChange={e => handleMetricChange(metricName, e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />;
        }
        if (measurementUnit === 'Yes/No') {
            return <CustomSelect value={value} onChange={v => handleMetricChange(metricName, v)} options={[{value: 'No', label: 'No'}, {value: 'Yes', label: 'Yes'}]} placeholder="Select Yes/No" />;
        }
        return <input type="text" value={value} onChange={e => handleMetricChange(metricName, e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />;
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-full">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">Record New Harvest Assessment</h2></div>
                <div className="p-8 space-y-6 overflow-y-auto">
                    {/* Harvest Details */}
                    <section>
                        <h3 className="text-lg font-semibold text-green-700 mb-4 border-b pb-2">1. Harvest Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Farmer</label>
                                <CustomSelect options={farmerOptions} value={farmerId} onChange={setFarmerId} placeholder="-- Select a Farmer --" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Harvest Date</label>
                                <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                            </div>
                             <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Gross Weight (kg)</label>
                                    <input type="number" step="0.01" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tare Weight (kg)</label>
                                    <input type="number" step="0.01" value={tareWeight} onChange={e => setTareWeight(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Net Weight (kg)</label>
                                    <p className="mt-1 w-full p-2.5 bg-gray-100 rounded-lg font-bold">{netWeight.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    {/* Quality Assessment */}
                    <section>
                        <h3 className="text-lg font-semibold text-green-700 mb-4 border-b pb-2">2. Quality Assessment</h3>
                        <div className="space-y-4">
                            {qualityStandards.map(standard => (
                                <div key={standard.id} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded-lg border">
                                    <div className="col-span-1">
                                        <label className="font-semibold text-gray-800">{standard.metricName}</label>
                                        <p className="text-xs text-gray-500">{standard.description}</p>
                                    </div>
                                    <div className="col-span-2">
                                        {renderMetricInput(standard)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    
                    {/* Summary */}
                    <section>
                         <h3 className="text-lg font-semibold text-green-700 mb-4 border-b pb-2">3. Summary & Notes</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                 <label className="block text-sm font-medium text-gray-700">Overall Grade</label>
                                 <CustomSelect
                                    value={overallGrade}
                                    onChange={v => setOverallGrade(v as OverallGrade)}
                                    options={Object.values(OverallGrade).map(g => ({ value: g, label: g }))}
                                 />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                         </div>
                    </section>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Saving...' : 'Save Assessment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HarvestForm;
