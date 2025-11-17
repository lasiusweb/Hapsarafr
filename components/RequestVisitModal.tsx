import React, { useState, useMemo } from 'react';
import { Farmer, User, VisitRequestStatus, ActivityType } from '../types';
import CustomSelect from './CustomSelect';
import { useDatabase } from '../DatabaseContext';
import { VisitRequestModel, ActivityLogModel } from '../db';

interface RequestVisitModalProps {
    onClose: () => void;
    onSave: (data: any) => Promise<void>; // This is a mock onSave, the real logic is inside
    farmer: Farmer;
    users: User[];
    currentUser: User; // Need this to log activity
}

const RequestVisitModal: React.FC<RequestVisitModalProps> = ({ onClose, onSave, farmer, users, currentUser }) => {
    const database = useDatabase();
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

        // Calculate priority score
        let priorityScore = 50; // Default
        const reasonLower = formState.reason.toLowerCase();
        if (reasonLower.includes('pest') || reasonLower.includes('disease') || reasonLower.includes('outbreak')) priorityScore = 90;
        if (reasonLower.includes('urgent') || reasonLower.includes('emergency')) priorityScore = 100;
        if (reasonLower.includes('subsidy') || reasonLower.includes('query') || reasonLower.includes('question')) priorityScore = 30;

        setIsSubmitting(true);
        try {
            await database.write(async () => {
                await database.get<VisitRequestModel>('visit_requests').create(req => {
                    req.farmerId = farmer.id;
                    req.reason = formState.reason;
                    req.preferredDate = formState.preferredDate;
                    req.assigneeId = formState.assigneeId || undefined;
                    req.notes = formState.notes;
                    req.status = formState.assigneeId ? VisitRequestStatus.Scheduled : VisitRequestStatus.Pending;
                    req.scheduledDate = formState.assigneeId ? new Date().toISOString() : undefined;
                    req.createdBy = currentUser.id;
                    req.tenantId = currentUser.tenantId;
                    req.syncStatusLocal = 'pending';
                    req.priorityScore = priorityScore;
                });
                await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = farmer.id;
                    log.activityType = ActivityType.VISIT_REQUESTED;
                    log.description = `Visit requested for reason: ${formState.reason}`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            onClose(); // This will trigger a re-render in the parent, showing the new request
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