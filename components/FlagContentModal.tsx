import React, { useState } from 'react';
import { User } from '../types';
import { getSupabase } from '../lib/supabase';

interface FlagContentModalProps {
    content: { id: string, type: 'post' | 'answer' };
    currentUser: User;
    onClose: () => void;
    setNotification: (n: any) => void;
}

const FlagContentModal: React.FC<FlagContentModalProps> = ({ content, currentUser, onClose, setNotification }) => {
    const [reason, setReason] = useState<'spam' | 'harmful' | 'harassment' | 'other'>('harmful');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = getSupabase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('forum_content_flags').insert({
                content_id: content.id,
                content_type: content.type,
                reason,
                notes,
                flagged_by_id: currentUser.id,
                status: 'pending',
            });
            if (error) throw error;
            setNotification({ message: 'Content has been flagged for review.', type: 'success' });
            onClose();
        } catch (err) {
            setNotification({ message: 'Failed to flag content.', type: 'error' });
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Flag Content</h2></div>
                <div className="p-8 space-y-4">
                    <p>Why are you flagging this {content.type}?</p>
                    <div className="space-y-2">
                        {(['harmful', 'spam', 'harassment', 'other'] as const).map(r => (
                            <label key={r} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 text-green-600" />
                                <span className="ml-3 capitalize text-gray-800">{r}</span>
                            </label>
                        ))}
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes (optional)" rows={3} className="w-full p-2 border rounded-md border-gray-300"></textarea>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        {isSubmitting ? 'Submitting...' : 'Submit Flag'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FlagContentModal;
