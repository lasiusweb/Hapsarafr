import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

interface HelpPageProps {
    onBack: () => void;
}

const HelpPage: React.FC<HelpPageProps> = ({ onBack }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    useEffect(() => {
        if (!process.env.API_KEY) {
            setError("Cannot initialize AI Assistant: Gemini API key is not configured.");
            return;
        }
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const systemInstruction = "You are a friendly and helpful AI assistant for the Hapsara Oil Palm Mission application. Your role is to answer user questions about how to use the app, explain oil palm subsidy guidelines, and provide best practices for oil palm cultivation. Keep your answers concise and clear. Format your responses with markdown.";
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction }
            });
            setChat(chatSession);
            setConversation([{ role: 'model', text: 'Hello! I am the Hapsara AI Assistant. How can I help you today with the app or with oil palm cultivation?' }]);
        } catch (e: any) {
            console.error("Failed to initialize chat:", e);
            setError("Failed to initialize the AI Assistant. Please check your API key and network connection.");
        }
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !chat || isChatLoading) return;

        const question = chatInput.trim();
        setIsChatLoading(true);
        setChatInput('');
        setConversation(prev => [...prev, { role: 'user', text: question }]);

        try {
            const result = await chat.sendMessageStream({ message: question });
            
            // Add a placeholder for the model's response
            setConversation(prev => [...prev, { role: 'model', text: '' }]);
            
            for await (const chunk of result) {
                const chunkText = chunk.text;
                setConversation(prev => {
                    const newConversation = [...prev];
                    const lastMessage = newConversation[newConversation.length - 1];
                    if (lastMessage.role === 'model') {
                        lastMessage.text += chunkText;
                    }
                    return newConversation;
                });
            }
        } catch (err: any) {
             console.error("Gemini chat error:", err);
             setConversation(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error while trying to respond. Please try again." }]);
        } finally {
            setIsChatLoading(false);
        }
    };
    
    const formatMarkdown = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .split('\n')
            .map(line => line.trim())
            .map(line => {
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    return `<li class="list-disc list-inside ml-4">${line.substring(2)}</li>`;
                }
                 if (line.startsWith('#')) {
                    const level = line.match(/^#+/)?.[0].length || 1;
                    return `<h${level + 3} class="font-bold my-2">${line.replace(/^#+\s*/, '')}</h${level + 3}>`;
                }
                return line ? `<p class="my-2">${line}</p>` : '';
            })
            .join('');
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
                        <div className="bg-white rounded-lg shadow-md h-[70vh] flex flex-col">
                            <h2 className="text-xl font-bold text-gray-800 p-6 border-b">AI Help Assistant</h2>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {conversation.map((msg, index) => (
                                    <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        <div className={`flex flex-col max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                            <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}></div>
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && conversation[conversation.length - 1].role === 'user' && (
                                     <div className="flex items-start gap-2.5">
                                        <div className="flex flex-col max-w-xs p-3 rounded-lg bg-gray-100 rounded-bl-none">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.2s]"></div>
                                                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            {error ? (
                                <div className="p-4 text-red-700 bg-red-50 text-center">{error}</div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask a question..." className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" disabled={isChatLoading} />
                                    <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-green-300">Send</button>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Contact Support</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                If the AI assistant can't help, please don't hesitate to reach out to our team.
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