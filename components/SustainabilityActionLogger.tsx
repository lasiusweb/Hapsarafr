
import React, { useState, useRef } from 'react';
import { useDatabase } from '../DatabaseContext';
import { Farmer } from '../types';
import { SustainabilityActionModel } from '../db';
import { User } from '../types';
import CustomSelect from './CustomSelect';

interface SustainabilityActionLoggerProps {
    farmer: Farmer;
    onClose: () => void;
    currentUser: User;
    onSaveSuccess: () => void;
}

const ACTIONS = [
    { value: 'Mulching', label: 'Organic Mulching' },
    { value: 'CoverCropping', label: 'Cover Cropping (Legumes)' },
    { value: 'DripIrrigation', label: 'Installed Drip Irrigation' },
    { value: 'BioControl', label: 'Biological Pest Control' }
];

const SustainabilityActionLogger: React.FC<SustainabilityActionLoggerProps> = ({ farmer, onClose, currentUser, onSaveSuccess }) => {
    const database = useDatabase();
    const [actionType, setActionType] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPhoto(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionType || !photo) {
            alert("Action type and verification photo are required.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<SustainabilityActionModel>('sustainability_actions').create(act => {
                    act.farmerId = farmer.id;
                    act.actionType = actionType;
                    act.description = description;
                    act.status = 'Pending'; // Needs verification
                    act.verificationPhotoUrl = photo; // In real app, upload to storage first
                    act.submittedAt = Date.now();
                    act.tenantId = currentUser.tenantId;
                });
            });
            onSaveSuccess();
            onClose();
        } catch(e) {
            console.error(e);
            alert("Failed to log action.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-green-600 p-4 text-white">
                    <h2 className="text-lg font-bold">Log Sustainability Action</h2>
                    <p className="text-sm opacity-90">Verify practices to earn Carbon Credits.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <CustomSelect label="Action Type" options={ACTIONS} value={actionType} onChange={setActionType} placeholder="Select Practice" />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full p-2 border rounded-md mt-1" 
                            rows={3} 
                            placeholder="Describe the area covered and materials used..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Verification Photo (Required)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition"
                        >
                            {photo ? (
                                <img src={photo} alt="Evidence" className="h-32 object-contain rounded" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span>Click to Capture Evidence</span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:opacity-50">
                            {isSubmitting ? 'Uploading...' : 'Submit for Verification'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SustainabilityActionLogger;
