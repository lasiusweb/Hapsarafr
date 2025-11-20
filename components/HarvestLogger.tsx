
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { CropAssignmentModel, HarvestLogModel, CropModel, ActivityLogModel, FarmPlotModel, FarmerModel } from '../db';
import { User, ActivityType } from '../types';
import { useQuery } from '../hooks/useQuery';
import { Q } from '@nozbe/watermelondb';
import { getFairPriceRange } from '../lib/priceOracle';
import { formatCurrency, normalizeToKg } from '../lib/utils';

interface HarvestLoggerProps {
    cropAssignment: CropAssignmentModel;
    onClose: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const HarvestLogger: React.FC<HarvestLoggerProps> = ({ cropAssignment, onClose, currentUser, setNotification }) => {
    const database = useDatabase();
    
    const crop = useQuery(useMemo(() => database.get<CropModel>('crops').query(Q.where('id', cropAssignment.cropId)), [database, cropAssignment.cropId]))[0];
    const [farmPlot, setFarmPlot] = useState<FarmPlotModel | null>(null);
    const [farmer, setFarmer] = useState<FarmerModel | null>(null);

    const [formData, setFormData] = useState({
        harvest_date: new Date().toISOString().split('T')[0],
        quantity: '',
        unit: crop?.defaultUnit || 'ton',
        notes: ''
    });
    const [estimatedValue, setEstimatedValue] = useState<number>(0);
    const [priceRange, setPriceRange] = useState<{low: number, high: number, fair: number} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data Validation State
    const [validationWarning, setValidationWarning] = useState<string | null>(null);

    // Fetch plot and farmer details for location-based pricing
    useEffect(() => {
        const fetchData = async () => {
            const plot = await cropAssignment.farmPlot.fetch();
            setFarmPlot(plot);
            if (plot) {
                const farmerRec = await plot.farmer.fetch();
                setFarmer(farmerRec);
            }
        };
        fetchData();
    }, [cropAssignment]);

    // Calculate estimated value & validate yield
    useEffect(() => {
        if (crop && farmer && farmPlot) {
            // 1. Price Estimation
            const range = getFairPriceRange(crop.name, farmer.district || 'Warangal');
            
            // Base logic: Price Oracle usually returns per Quintal or Ton based on crop. 
            // Normalizing for display.
            
            let unitMultiplier = 1; 
            if (crop.name === 'Oil Palm') {
                 // Oracle is per Ton.
                 if (formData.unit === 'kg') unitMultiplier = 0.001;
                 if (formData.unit === 'quintal') unitMultiplier = 0.1;
                 if (formData.unit === 'bunch') unitMultiplier = 0.02; 
            } else {
                 // Oracle is per Quintal.
                 if (formData.unit === 'kg') unitMultiplier = 0.01;
                 if (formData.unit === 'ton') unitMultiplier = 10;
            }

            setPriceRange({
                low: range.low * unitMultiplier,
                high: range.high * unitMultiplier,
                fair: range.fair * unitMultiplier
            });

            const qty = parseFloat(formData.quantity);
            if (!isNaN(qty)) {
                setEstimatedValue(qty * range.fair * unitMultiplier);

                // 2. Yield Logic Validation (Hapsara Agros)
                // Check if yield per acre is biologically plausible
                const kgYield = normalizeToKg(qty, formData.unit);
                const tonsPerAcre = (kgYield / 1000) / farmPlot.acreage;
                
                // Oil Palm mature yield ~10-12 tons/acre/year. Single harvest shouldn't exceed ~2-3 tons/acre usually.
                // Setting a soft limit warning.
                if (crop.name === 'Oil Palm' && tonsPerAcre > 5) {
                    setValidationWarning(`Warning: ${tonsPerAcre.toFixed(1)} tons/acre seems unusually high for a single harvest. Please verify.`);
                } else if (crop.name === 'Oil Palm' && tonsPerAcre < 0.1 && qty > 0) {
                    setValidationWarning(`Notice: Yield seems very low (${tonsPerAcre.toFixed(2)} t/ac). Is this a partial harvest?`);
                } else {
                    setValidationWarning(null);
                }
            } else {
                setEstimatedValue(0);
                setValidationWarning(null);
            }
        }
    }, [formData.quantity, crop, farmer, formData.unit, farmPlot]);

    const handleSave = async () => {
        const quantity = parseFloat(formData.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }
        
        if (validationWarning && !window.confirm("The data looks unusual. Are you sure you want to submit?")) {
            return;
        }

        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<HarvestLogModel>('harvest_logs').create(hl => {
                    hl.cropAssignmentId = cropAssignment.id;
                    hl.harvestDate = formData.harvest_date;
                    hl.quantity = quantity;
                    hl.unit = formData.unit;
                    hl.notes = formData.notes;
                    hl.createdBy = currentUser.id;
                });

                if (farmPlot && farmer) {
                     await database.get<ActivityLogModel>('activity_logs').create(log => {
                        log.farmerId = farmer.id;
                        log.activityType = ActivityType.HARVEST_LOGGED;
                        log.description = `Harvest: ${quantity} ${formData.unit} of ${crop?.name}. Est. Value: ${formatCurrency(estimatedValue)}`;
                        log.createdBy = currentUser.id;
                        log.tenantId = currentUser.tenantId;
                    });
                }
            });
            setNotification({ message: `Harvest logged. Est. Earnings: ${formatCurrency(estimatedValue)}`, type: 'success' });
            onClose();
        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to log harvest.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b bg-green-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-green-900">Log Harvest: {crop?.name}</h2>
                    <p className="text-sm text-green-700">Record yield for {farmPlot?.name} ({farmPlot?.acreage} ac).</p>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Harvest Date</label>
                            <input type="date" value={formData.harvest_date} onChange={e => setFormData(s => ({ ...s, harvest_date: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4 items-start">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input type="number" step="0.01" value={formData.quantity} onChange={e => setFormData(s => ({ ...s, quantity: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-lg font-semibold" placeholder="0.00" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Unit</label>
                            <select value={formData.unit} onChange={e => setFormData(s => ({ ...s, unit: e.target.value }))} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white">
                                <option value="tons">Tons (1000kg)</option>
                                <option value="quintal">Quintals (100kg)</option>
                                <option value="kg">Kilograms (kg)</option>
                                <option value="bunch">Bunches</option>
                                <option value="bag">Gunny Bags (~50kg)</option>
                            </select>
                        </div>
                    </div>

                    {validationWarning && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2 text-sm text-yellow-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-yellow-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {validationWarning}
                        </div>
                    )}
                    
                    {/* Real-time Value Estimation */}
                    <div className="bg-white p-4 rounded-lg border-2 border-green-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-sm text-gray-500">Market Price ({farmer?.district})</span>
                             <span className="text-sm font-medium text-gray-700">
                                 {priceRange ? `${formatCurrency(priceRange.low)} - ${formatCurrency(priceRange.high)} / ${formData.unit}` : 'Loading...'}
                             </span>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                            <div>
                                <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Estimated Earnings</p>
                                <p className="text-xs text-gray-400">Based on fair market value</p>
                            </div>
                            <p className="text-2xl font-extrabold text-green-700">{formatCurrency(estimatedValue)}</p>
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea value={formData.notes} onChange={e => setFormData(s => ({...s, notes: e.target.value}))} rows={2} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g. Good quality, harvested early morning..."></textarea>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold transition shadow-sm">
                        {isSubmitting ? 'Saving...' : 'Log Harvest'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HarvestLogger;
