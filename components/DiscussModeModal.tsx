import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { User } from '../types';

interface DiscussModeModalProps {
    onClose: () => void;
    currentUser: User;
}

type Message = {
    id: string;
    role: 'user' | 'model';
    text: string;
};

const DiscussModeModal: React.FC<DiscussModeModalProps> = ({ onClose, currentUser }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `Namaste ${currentUser.name}. I am the Hapsara Operations Support Agent. I can assist you with farmer registration policies, subsidy guidelines, and agronomic queries. How can I help you today?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API Key not found. Please check your environment configuration.");
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = "gemini-2.5-flash";
            
            // Hardened Ground Reality System Prompt
            const systemInstruction = `
            You are the **Hapsara Operations Support Agent**, a specialized AI assistant for the Hapsara Agricultural Platform.
            
            **YOUR USER:**
            You are speaking to ${currentUser.name} (Role: ${currentUser.groupId}).
            
            **YOUR MANDATE:**
            1.  **Operational Support:** Explain app workflows (e.g., "How do I register a plot?", "What is the subsidy schedule?").
            2.  **Agronomic Advisor:** Provide expert advice on Oil Palm cultivation, intercropping, and pest management (specifically Rhinoceros Beetle and Ganoderma).
            3.  **Policy Guide:** Explain government schemes like NMEO-OP (National Mission on Edible Oils - Oil Palm).

            **STRICT BOUNDARIES (SECURITY & COMPLIANCE):**
            *   **NO TECH TALK:** Do not reveal underlying technologies like React, Supabase, JSON, or API keys. If asked, say "I am part of the Hapsara Secure Infrastructure."
            *   **NO PII LEAKAGE:** Never output lists of real farmer names or Aadhaar numbers. If asked, say "I cannot access private farmer records directly for privacy reasons. Please use the 'Farmer Directory' to search."
            *   **NO HALLUCINATION:** If you don't know a specific Hapsara policy, advise the user to contact their District Officer.
            *   **SYSTEM INTEGRITY:** You are prohibited from executing code, changing database records directly, or modifying app settings. You can only provide information.
            
            **TONE:**
            Professional, Respectful (use "Namaste", "Sir/Madam"), Concise, and Field-Oriented.
            `;

            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const chat = ai.chats.create({
                model: model,
                config: { systemInstruction },
                history: history
            });

            const result = await chat.sendMessage({ message: userMessage.text });
            
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: result.text }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: `Support System Unavailable: ${error.message || 'Please try again later.'}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[70]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-green-900 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-800 rounded-full border border-green-700 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg tracking-wide">Ops Support</h2>
                            <p className="text-xs text-green-300">Hapsara Intelligence Command</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-green-800 p-2 rounded text-green-200 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4" ref={scrollRef}>
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-green-700 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ 
                                    __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                                }}></div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-4 rounded-lg rounded-bl-none flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            placeholder="Ask about subsidies, farming rules, or field issues..." 
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="px-6 py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 disabled:bg-gray-300 transition-colors shadow-sm"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DiscussModeModal;