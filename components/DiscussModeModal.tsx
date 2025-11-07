import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

interface DiscussModeModalProps {
    onClose: () => void;
}

const DiscussModeModal: React.FC<DiscussModeModalProps> = ({ onClose }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
            const systemInstruction = "You are a helpful AI assistant. The user is a business owner (tenant) using the Hapsara application to manage oil palm farmers. A key point to remember is that subsidy payments are made by the Government, not the business owner. The business owner's primary concern is tracking whether a farmer has *received* the subsidy, not paying it themselves. Frame your discussions and answers with this context in mind. You can chat about anything, but keep this context in mind if the topic is about subsidies or finances.";
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction }
            });
            setChat(chatSession);
            setConversation([{ role: 'model', text: 'Welcome to Discuss Mode! You can chat with me about anything. How can I help?' }]);
        } catch (e: any) {
            console.error("Failed to initialize chat:", e);
            setError("Failed to initialize the AI Assistant. Please check your API key and network connection.");
        }
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !chat || isLoading) return;

        const question = chatInput.trim();
        setIsLoading(true);
        setChatInput('');
        setConversation(prev => [...prev, { role: 'user', text: question }]);

        try {
            const result = await chat.sendMessageStream({ message: question });
            
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
             setConversation(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                        <h2 className="text-xl font-bold text-gray-800">Discuss Mode</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conversation.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            <div className={`flex flex-col max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}></div>
                            </div>
                        </div>
                    ))}
                    {isLoading && conversation.length > 0 && conversation[conversation.length - 1].role === 'user' && (
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
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Chat with the AI assistant..." className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" disabled={isLoading} />
                        <button type="submit" disabled={isLoading || !chatInput.trim()} className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-green-300">Send</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DiscussModeModal;
