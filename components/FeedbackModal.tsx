import React, { useState } from 'react';

const FeedbackModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [feedback, setFeedback] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim()) {
            // In a real app, this would send to an API
            alert('Thank you for your feedback!');
            onClose();
        } else {
            alert('Please enter your feedback before submitting.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Submit Feedback</h2>
                    <p className="text-gray-500 text-sm mt-1">We'd love to hear your thoughts on how we can improve.</p>
                </div>
                <div className="p-6">
                   <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us what you think..."
                        className="w-full h-32 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        required
                   />
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">Submit</button>
                </div>
            </form>
        </div>
    );
};

export default FeedbackModal;
