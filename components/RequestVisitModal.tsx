import React, { useState, useMemo } from 'react';
import { Farmer, User, VisitRequestStatus, ActivityType } from '../types';
import CustomSelect from './CustomSelect';

interface RequestVisitModalProps {
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    farmer: Farmer;
    users: User[];
}

const RequestVisitModal: React.FC<RequestVisitModalProps> = ({ onClose, onSave, farmer, users }) => {
    const [formState, setFormState] = useState({
        reason: '',
        preferredDate: new Date().toISOString().split('T')[0],
        assigneeId: '',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.reason || !formState.preferredDate) {
            alert('Please fill in a reason and preferred date.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...formState,
                status: formState.assigneeId ? VisitRequestStatus.Scheduled : VisitRequestStatus.Pending,
                scheduledDate: formState.assigneeId ? new Date().toISOString() : undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Request Field Visit for {farmer.fullName}</h2>
                </div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Reason for Visit *</label>
                        <textarea value={formState.reason} onChange={e => setFormState(s => ({...s, reason: e.target.value}))} required rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Pest inspection, Subsidy query..."></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Preferred Date *</label>
                            <input type="date" value={formState.preferredDate} onChange={e => setFormState(s => ({...s, preferredDate: e.target.value}))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assign To (Optional)</label>
                            <CustomSelect value={formState.assigneeId} onChange={v => setFormState(s => ({...s, assigneeId: v}))} options={userOptions} placeholder="Unassigned" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea value={formState.notes} onChange={e => setFormState(s => ({...s, notes: e.target.value}))} rows={2} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RequestVisitModal;