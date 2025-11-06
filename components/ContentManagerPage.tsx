import React, { useState, useEffect, useCallback } from 'react';
import { AppContent, FAQItem } from '../types';

interface ContentManagerPageProps {
    supabase: any;
    currentContent: Partial<AppContent> | null;
    onContentSave: () => void;
    onBack: () => void;
}

const ContentManagerPage: React.FC<ContentManagerPageProps> = ({ supabase, currentContent, onContentSave, onBack }) => {
    const [activeTab, setActiveTab] = useState<'landing' | 'faq' | 'privacy'>('landing');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [heroTitle, setHeroTitle] = useState('');
    const [heroSubtitle, setHeroSubtitle] = useState('');
    const [aboutUs, setAboutUs] = useState('');
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [privacyPolicy, setPrivacyPolicy] = useState('');

    useEffect(() => {
        if (currentContent) {
            setHeroTitle(currentContent.landing_hero_title || '');
            setHeroSubtitle(currentContent.landing_hero_subtitle || '');
            setAboutUs(currentContent.landing_about_us || '');
            setFaqs(currentContent.faqs || []);
            setPrivacyPolicy(currentContent.privacy_policy || '');
        }
    }, [currentContent]);

    const handleAddFaq = () => {
        setFaqs([...faqs, { id: `new-${Date.now()}`, question: '', answer: '' }]);
    };
    
    const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
        const newFaqs = [...faqs];
        newFaqs[index][field] = value;
        setFaqs(newFaqs);
    };

    const handleDeleteFaq = (id: string) => {
        if (window.confirm('Are you sure you want to delete this FAQ?')) {
            setFaqs(faqs.filter(faq => faq.id !== id));
        }
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const landingPageContent = {
                hero_title: heroTitle,
                hero_subtitle: heroSubtitle,
                about_us: aboutUs
            };
            const privacyPolicyContent = {
                content: privacyPolicy
            };
            const faqContent = {
                items: faqs.map(({ id, ...rest }) => ({ ...rest, id: id.startsWith('new-') ? crypto.randomUUID() : id })) // Ensure new items get a real ID
            };

            const { error: landingError } = await supabase.from('app_content').upsert({ key: 'landing_page', value: landingPageContent });
            const { error: privacyError } = await supabase.from('app_content').upsert({ key: 'privacy_policy', value: privacyPolicyContent });
            const { error: faqError } = await supabase.from('app_content').upsert({ key: 'faqs', value: faqContent });

            if (landingError || privacyError || faqError) {
                throw landingError || privacyError || faqError;
            }

            alert('Content saved successfully!');
            onContentSave(); // Re-fetch content in parent
        } catch (error: any) {
            console.error("Error saving content:", error);
            alert(`Failed to save content: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const renderLandingPageForm = () => (
        <div className="space-y-6">
            <div>
                <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-700">Hero Title</label>
                <input type="text" id="heroTitle" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
             <div>
                <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700">Hero Subtitle</label>
                <textarea id="heroSubtitle" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md"></textarea>
            </div>
             <div>
                <label htmlFor="aboutUs" className="block text-sm font-medium text-gray-700">About Us Content (HTML allowed)</label>
                <textarea id="aboutUs" value={aboutUs} onChange={e => setAboutUs(e.target.value)} rows={8} className="mt-1 w-full p-2 border rounded-md font-mono"></textarea>
            </div>
        </div>
    );
    
    const renderFaqForm = () => (
        <div>
            {faqs.map((faq, index) => (
                <div key={faq.id} className="p-4 border rounded-md mb-4 bg-gray-50 relative">
                    <button onClick={() => handleDeleteFaq(faq.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700">Question</label>
                        <input type="text" value={faq.question} onChange={e => handleFaqChange(index, 'question', e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Answer</label>
                        <textarea value={faq.answer} onChange={e => handleFaqChange(index, 'answer', e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md"></textarea>
                    </div>
                </div>
            ))}
            <button onClick={handleAddFaq} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                + Add FAQ
            </button>
        </div>
    );

    const renderPrivacyPolicyForm = () => (
        <div>
            <label htmlFor="privacyPolicy" className="block text-sm font-medium text-gray-700">Privacy Policy (HTML allowed)</label>
            <textarea id="privacyPolicy" value={privacyPolicy} onChange={e => setPrivacyPolicy(e.target.value)} rows={20} className="mt-1 w-full p-2 border rounded-md font-mono"></textarea>
        </div>
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Content Manager</h1>
                        <p className="text-gray-500">Edit content across the application.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>
                
                 <div className="bg-white rounded-lg shadow-xl p-2">
                    <div className="flex border-b">
                        <button onClick={() => setActiveTab('landing')} className={`px-4 py-3 font-semibold ${activeTab === 'landing' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Landing Page</button>
                        <button onClick={() => setActiveTab('faq')} className={`px-4 py-3 font-semibold ${activeTab === 'faq' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Help Center (FAQs)</button>
                        <button onClick={() => setActiveTab('privacy')} className={`px-4 py-3 font-semibold ${activeTab === 'privacy' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Privacy Policy</button>
                    </div>

                    <div className="p-6">
                       {activeTab === 'landing' && renderLandingPageForm()}
                       {activeTab === 'faq' && renderFaqForm()}
                       {activeTab === 'privacy' && renderPrivacyPolicyForm()}
                    </div>
                     <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg mt-4">
                         <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold disabled:bg-green-300">
                             {isSaving ? 'Saving...' : 'Save All Changes'}
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentManagerPage;
