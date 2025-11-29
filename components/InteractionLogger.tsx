

import React, { useState, useRef } from 'react';
import { InteractionType, InteractionOutcome, Farmer, User } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { InteractionModel, ActivityLogModel } from '../db';
import { ActivityType } from '../types';

interface InteractionLoggerProps {
    farmer: Farmer;
    currentUser: User;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const InteractionLogger: React.FC<InteractionLoggerProps> = ({ farmer, currentUser, onClose, onSaveSuccess }) => {
    const database = useDatabase();
    const [type, setType] = useState<InteractionType>(InteractionType.FIELD_VISIT);
    const [outcome, setOutcome] = useState<InteractionOutcome>(InteractionOutcome.POSITIVE);
    const [notes, setNotes] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!notes) {
            alert("Notes are required.");
            return;
        }

        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<InteractionModel>('interactions').create(i => {
                    i.farmerId = farmer.id;
                    i.personnelId = currentUser.id; // Assuming User ID maps to Personnel
                    i.type = type;
                    i.outcome = outcome;
                    i.notes = notes;
                    i.date = new Date().toISOString();
                    i.photoUrl = photo || undefined;
                    i.tenantId = currentUser.tenantId;
                    i.syncStatusLocal = 'pending';
                });

                // Log redundant activity log for legacy support
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = 'INTERACTION_LOGGED';
                    log.description = `${type} - ${outcome}: ${notes.substring(0, 50)}...`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save interaction.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[80]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b bg-indigo-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-indigo-900">Log Interaction</h2>
                    <p className="text-sm text-indigo-700">Record details of your engagement with {farmer.fullName}.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interaction Type</label>
                        <CustomSelect 
                            value={type} 
                            onChange={v => setType(v as InteractionType)} 
                            options={Object.values(InteractionType).map(t => ({value: t, label: t.replace('_', ' ')}))} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outcome / Sentiment</label>
                        <div className="flex gap-2">
                            {[
                                { val: InteractionOutcome.POSITIVE, label: 'Positive', color: 'bg-green-100 text-green-800 border-green-200' },
                                { val: InteractionOutcome.NEUTRAL, label: 'Neutral', color: 'bg-gray-100 text-gray-800 border-gray-200' },
                                { val: InteractionOutcome.NEGATIVE, label: 'Negative', color: 'bg-red-100 text-red-800 border-red-200' },
                                { val: InteractionOutcome.REQUIRES_FOLLOW_UP, label: 'Follow Up', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                            ].map(opt => (
                                <button
                                    type="button"
                                    key={opt.val}
                                    onClick={() => setOutcome(opt.val)}
                                    className={`flex-1 py-2 text-xs font-bold rounded border-2 transition-all ${outcome === opt.val ? `${opt.color} border-current` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                            rows={4} 
                            placeholder="What was discussed? Any issues raised?"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo Evidence (Optional)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition"
                        >
                            {photo ? (
                                <img src={photo} alt="Evidence" className="h-32 object-contain rounded" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <span className="block text-xs">Click to Capture</span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InteractionLogger;