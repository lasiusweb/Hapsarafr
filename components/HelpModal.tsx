import React from 'react';
import { AppContent } from '../types';

const HelpModal: React.FC<{ onClose: () => void; appContent: Partial<AppContent> | null; }> = ({ onClose, appContent }) => {
    
    const defaultFaqs = [
        { id: '1', question: 'How do I sync my data?', answer: 'The "Sync Now" button in the header will push your local changes to the server. The app also syncs automatically in the background when you are online.' },
        { id: '2', question: 'Can I work offline?', answer: 'Yes! All registrations and edits are saved locally to your device. When you reconnect to the internet, your changes will be synced.' }
    ];

    const faqs = appContent?.faqs && appContent.faqs.length > 0 ? appContent.faqs : defaultFaqs;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Help & Support</h2>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-gray-600">
                   <h3 className="font-bold text-gray-800">Frequently Asked Questions</h3>
                   <div className="space-y-4">
                       {faqs.map(faq => (
                           <div key={faq.id}>
                               <p className="font-semibold text-gray-700">Q: {faq.question}</p>
                               <p>A: {faq.answer}</p>
                           </div>
                       ))}
                   </div>
                   <h3 className="font-bold text-gray-800 mt-6">Contact Support</h3>
                   <p>If you encounter any issues or have questions, please contact our support team at <a href="mailto:support@hapsara.com" className="text-green-600 hover:underline">support@hapsara.com</a>.</p>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition">Close</button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
