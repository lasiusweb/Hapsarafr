import React, { useState, useRef } from 'react';
import { User } from '../types';
import { getSupabase } from '../lib/supabase';

interface AskQuestionModalProps {
    currentUser: User;
    onClose: () => void;
    setNotification: (n: any) => void;
}

const AskQuestionModal: React.FC<AskQuestionModalProps> = ({ currentUser, onClose, setNotification }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = getSupabase();

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setNotification({ message: 'Title and content are required.', type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('forum_posts').insert({
                title,
                content,
                author_id: currentUser.id,
                tenant_id: currentUser.tenantId
            });
            if (error) throw error;
            setNotification({ message: 'Question posted successfully!', type: 'success' });
            onClose();
        } catch (err) {
            setNotification({ message: 'Failed to post question.', type: 'error' });
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <form onSubmit={handleAskQuestion} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Ask a New Question</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label htmlFor="question-title" className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            id="question-title"
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Best practices for intercropping in Year 2?"
                        />
                    </div>
                    <div>
                        <label htmlFor="question-content" className="block text-sm font-medium text-gray-700">Details</label>
                        <textarea
                            id="question-content"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            rows={8}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                            placeholder="Provide more details about your question..."
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">You can use markdown for formatting (e.g., *italic*, **bold**).</p>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">
                        {isSubmitting ? 'Posting...' : 'Post Question'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AskQuestionModal;
