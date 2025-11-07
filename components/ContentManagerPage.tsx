import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppContent, FAQItem } from '../types';

interface ContentManagerPageProps {
    supabase: any;
    currentContent: Partial<AppContent> | null;
    onContentSave: () => void;
    onBack: () => void;
}

// --- Rich Text Area Component ---

interface RichTextAreaProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    rows: number;
}

const ToolbarButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className="p-2 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900"
        aria-label={title}
    >
        {children}
    </button>
);

const RichTextArea: React.FC<RichTextAreaProps> = ({ id, value, onChange, rows }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const applyStyle = (openTag: string, closeTag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        if (selectedText) {
            const newText = `${value.substring(0, start)}${openTag}${selectedText}${closeTag}${value.substring(end)}`;
            onChange(newText);
            // After state update, focus and set selection
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + openTag.length, end + openTag.length);
            }, 0);
        }
    };
    
     const applyList = (listTag: 'ul' | 'ol') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // Find the start and end of the lines that are selected
        let lineStart = start;
        while (lineStart > 0 && value[lineStart - 1] !== '\n') {
            lineStart--;
        }
        let lineEnd = end;
        // Adjust lineEnd to include the full line if selection ends mid-line
        while (lineEnd < value.length && value[lineEnd] !== '\n' && value[lineEnd] !== '\r') {
            lineEnd++;
        }
        
        const selectedLinesText = value.substring(lineStart, lineEnd).trim();
        const lines = selectedLinesText.split('\n').filter(line => line.trim() !== '');

        if (lines.length > 0) {
            const newListItems = lines.map(line => `  <li>${line.trim()}</li>`).join('\n');
            const listBlock = `\n<${listTag}>\n${newListItems}\n</${listTag}>\n`;
            
            const newText = `${value.substring(0, lineStart)}${listBlock}${value.substring(lineEnd)}`;
            onChange(newText);
        }
    };


    return (
        <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
            <div className="flex items-center gap-1 p-1 bg-gray-100 border-b border-gray-300 rounded-t-md">
                <ToolbarButton title="Bold" onClick={() => applyStyle('<strong>', '</strong>')}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.674zm0 6.788V8.598h1.8c1.157 0 1.904.43 1.904 1.386 0 .931-.722 1.43-1.943 1.43H5.908z"/></svg>
                </ToolbarButton>
                <ToolbarButton title="Italic" onClick={() => applyStyle('<em>', '</em>')}>
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/></svg>
                </ToolbarButton>
                 <ToolbarButton title="Heading 3" onClick={() => applyStyle('<h3>', '</h3>')}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path d="M6.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L12.293 11H3.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h8.793L6.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                </ToolbarButton>
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <ToolbarButton title="Unordered List" onClick={() => applyList('ul')}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
                </ToolbarButton>
                <ToolbarButton title="Ordered List" onClick={() => applyList('ol')}>
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"/><path d="M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.363-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.954.772 0 .285-.215.51-.585.545v.05c.327.036.558.258.558.59 0 .422-.413.713-1.127.713-.693 0-1.13-.3-1.13-.715 0-.38.255-.585.65-.585h.045l.003.011c.017.07.033.15.033.224 0 .18-.147.29-.33.29-.196 0-.322-.1-.322-.284a.5.5 0 0 0-.11-.318zM4.5 13.5v-1c0-.535.342-1.002 1.036-1.002.637 0 1.036.446 1.036 1.002v1c0 .556-.4.991-1.036.991-.638 0-1.036-.435-1.036-.991zM4 3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/></svg>
                </ToolbarButton>
            </div>
            <textarea
                ref={textareaRef}
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={rows}
                className="w-full p-2 border-none rounded-b-md focus:ring-0 font-mono"
            />
        </div>
    );
};

// --- Main Component ---

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
                <input type="text" id="heroTitle" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
            </div>
             <div>
                <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700">Hero Subtitle</label>
                <textarea id="heroSubtitle" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
            </div>
             <div>
                <label htmlFor="aboutUs" className="block text-sm font-medium text-gray-700 mb-1">About Us Content</label>
                <p className="text-xs text-gray-500 mb-2">Allowed tags: p, strong, em, ul, ol, li, h3, b, i, br</p>
                <RichTextArea id="aboutUs" value={aboutUs} onChange={setAboutUs} rows={10} />
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
                        <input type="text" value={faq.question} onChange={e => handleFaqChange(index, 'question', e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Answer</label>
                        <textarea value={faq.answer} onChange={e => handleFaqChange(index, 'answer', e.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md"></textarea>
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
            <label htmlFor="privacyPolicy" className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy</label>
            <p className="text-xs text-gray-500 mb-2">Allowed tags: p, strong, em, ul, ol, li, h3, b, i, br</p>
            <RichTextArea id="privacyPolicy" value={privacyPolicy} onChange={setPrivacyPolicy} rows={20} />
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