import React, { useState } from 'react';
import { AppContent } from '../types';

interface HelpPageProps {
    appContent: Partial<AppContent> | null;
    onBack: () => void;
}

const FAQAccordionItem: React.FC<{ faq: { question: string; answer: string }; isOpen: boolean; onClick: () => void; }> = ({ faq, isOpen, onClick }) => {
    return (
        <div className="border-b">
            <button
                onClick={onClick}
                className="w-full flex justify-between items-center text-left py-4 px-2 hover:bg-gray-50"
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-gray-800">{faq.question}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 bg-gray-50 text-gray-600">
                    <p>{faq.answer}</p>
                </div>
            )}
        </div>
    );
};


const HelpPage: React.FC<HelpPageProps> = ({ appContent, onBack }) => {
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');

    const defaultFaqs = [
        { id: '1', question: 'How do I sync my data?', answer: 'The "Sync Now" button in the header will push your local changes to the server. The app also syncs automatically in the background when you are online.' },
        { id: '2', question: 'Can I work offline?', answer: 'Yes! All registrations and edits are saved locally to your device. When you reconnect to the internet, your changes will be synced.' }
    ];

    const faqs = appContent?.faqs && appContent.faqs.length > 0 ? appContent.faqs : defaultFaqs;

    const handleFaqClick = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim()) {
            // In a real app, this would send to an API
            alert('Thank you for your feedback!');
            setFeedback('');
        } else {
            alert('Please enter your feedback before submitting.');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Help & Support</h1>
                        <p className="text-gray-500">Find answers to your questions and get in touch with us.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        {/* FAQs Section */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
                            <div className="border-t">
                                {faqs.map((faq, index) => (
                                    <FAQAccordionItem
                                        key={faq.id}
                                        faq={faq}
                                        isOpen={openFaqIndex === index}
                                        onClick={() => handleFaqClick(index)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                             <h2 className="text-xl font-bold text-gray-800 mb-4">Submit Feedback</h2>
                            <form onSubmit={handleFeedbackSubmit}>
                               <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Tell us what you think..."
                                    className="w-full h-32 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                                    required
                               />
                               <button type="submit" className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold">
                                   Submit
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Contact Support</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                If you can't find an answer in the FAQs, please don't hesitate to reach out to us.
                            </p>
                            <div className="space-y-4">
                                 <a href="mailto:support@hapsara.com" className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    <div>
                                        <p className="font-semibold text-gray-700">Email Us</p>
                                        <p className="text-sm text-green-600">support@hapsara.com</p>
                                    </div>
                                </a>
                                <div className="flex items-center gap-3 p-3">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    <div>
                                        <p className="font-semibold text-gray-700">Call Us</p>
                                        <p className="text-sm text-gray-500">+91 88 97 66 44 03</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;