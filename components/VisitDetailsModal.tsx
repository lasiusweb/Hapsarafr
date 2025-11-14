
import React, { useState, useEffect, useMemo } from 'react';
import { User, VisitRequestStatus } from '../types';
import { VisitRequestModel, FarmerModel } from '../db';
import CustomSelect from './CustomSelect';

interface VisitDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (request: VisitRequestModel, updates: { assigneeId?: string; scheduledDate?: string; resolutionNotes?: string; status?: VisitRequestStatus }) => Promise<void>;
    onCancelVisit: (request: VisitRequestModel) => Promise<void>;
    request: VisitRequestModel | null;
    farmer?: FarmerModel;
    users: User[];
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({ isOpen, onClose, onSave, onCancelVisit, request, farmer, users }) => {
    const [formState, setFormState] = useState({
        assigneeId: '',
        scheduledDate: '',
        resolutionNotes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (request) {
            setFormState({
                assigneeId: request.assigneeId || '',
                scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toISOString().split('T')[0] : '',
                resolutionNotes: request.resolutionNotes || '',
            });
        }
    }, [request]);

    const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);
    const createdByUser = useMemo(() => users.find(u => u.id === request?.createdBy)?.name || 'Unknown', [users, request]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request) return;

        setIsSubmitting(true);
        try {
            const updates: any = { ...formState };
            if (formState.assigneeId && request.status === VisitRequestStatus.Pending) {
                updates.status = VisitRequestStatus.Scheduled;
                if (!formState.scheduledDate) {
                    updates.scheduledDate = new Date().toISOString();
                }
            }
            await onSave(request, updates);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancelVisit = async () => {
        if (request && window.confirm('Are you sure you want to cancel this visit request?')) {
            await onCancelVisit(request);
        }
    }

    if (!isOpen || !request) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Visit Details</h2>
                    <p className="text-sm text-gray-500">For {farmer?.fullName || '...'}</p>
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="font-semibold">Reason for Visit:</p>
                        <p>{request.reason}</p>
                        <p className="text-xs text-gray-500 mt-2">Requested by {createdByUser} on {new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <p className="mt-1 font-semibold">{request.status}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Preferred Date</label>
                            <p className="mt-1">{new Date(request.preferredDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assign To</label>
                            <CustomSelect value={formState.assigneeId} onChange={v => setFormState(s => ({...s, assigneeId: v}))} options={userOptions} placeholder="Unassigned" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Scheduled Date</label>
                            <input type="date" value={formState.scheduledDate} onChange={e => setFormState(s => ({...s, scheduledDate: e.target.value}))} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Initial Notes</label>
                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 border rounded-md min-h-[50px]">{request.notes || 'No initial notes.'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Resolution Notes</label>
                        <textarea value={formState.resolutionNotes} onChange={e => setFormState(s => ({...s, resolutionNotes: e.target.value}))} rows={4} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="Enter details about the visit outcome here..."></textarea>
                    </div>

                </div>
                <div className="bg-gray-100 p-4 flex justify-between items-center rounded-b-lg">
                    <button type="button" onClick={handleCancelVisit} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-semibold text-sm">Cancel Visit</button>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default VisitDetailsModal;
