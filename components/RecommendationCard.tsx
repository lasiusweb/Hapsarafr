
import React, { useState } from 'react';
import { AgronomicRecommendation } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';

interface RecommendationCardProps {
    recommendation: AgronomicRecommendation;
    onAction?: () => void;
    onDismiss?: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onAction, onDismiss }) => {
    const [showReasoning, setShowReasoning] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    const priorityStyles = {
        'High': 'border-l-4 border-red-500 bg-red-50',
        'Medium': 'border-l-4 border-yellow-500 bg-yellow-50',
        'Low': 'border-l-4 border-blue-500 bg-blue-50',
    };

    // Parse social proof if available
    let socialProof = null;
    if (recommendation.socialProofJson) {
        try {
            socialProof = JSON.parse(recommendation.socialProofJson);
        } catch (e) { /* ignore */ }
    }

    // Parse action info if available
    let actionInfo = { label: 'Take Action' };
    if (recommendation.actionJson) {
         try {
            const parsed = JSON.parse(recommendation.actionJson);
            if(parsed.label) actionInfo.label = parsed.label;
        } catch (e) { /* ignore */ }
    }


    const handleSpeak = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) {
            // Stop if currently playing (basic toggle for browser synthesis)
            window.speechSynthesis.cancel();
            if (audioContext) {
                audioContext.close();
                setAudioContext(null);
            }
            setIsPlaying(false);
            return;
        }

        setIsPlaying(true);

        // Try Gemini TTS first if configured
        if (process.env.API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-preview-tts',
                    contents: { parts: [{ text: `${recommendation.title}. ${recommendation.description}. ${socialProof ? socialProof.text : ''}` }] },
                    config: { responseModalities: [Modality.AUDIO] },
                });

                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                    setAudioContext(ctx);
                    
                    // Decode base64
                    const binaryString = atob(base64Audio);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
                    
                    const dataInt16 = new Int16Array(bytes.buffer);
                    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
                    const channelData = buffer.getChannelData(0);
                    for (let i = 0; i < dataInt16.length; i++) { channelData[i] = dataInt16[i] / 32768.0; }

                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.onended = () => { setIsPlaying(false); };
                    source.start();
                    return;
                }
            } catch (error) {
                console.warn("Gemini TTS failed, falling back to browser TTS", error);
            }
        }

        // Fallback to Browser TTS
        const utterance = new SpeechSynthesisUtterance(`${recommendation.title}. ${recommendation.description}. ${socialProof ? socialProof.text : ''}`);
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className={`rounded-lg shadow-sm p-4 mb-4 transition-all ${priorityStyles[recommendation.priority] || 'bg-white border border-gray-200'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => setShowReasoning(!showReasoning)}>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800">{recommendation.title}</h4>
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-white/50 text-gray-600 border border-gray-200">{recommendation.priority}</span>
                    </div>
                    <p className="text-sm text-gray-700">{recommendation.description}</p>
                    
                    {/* Inventory & Wallet Alerts */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {recommendation.inventoryStatus === 'OUT_OF_STOCK' && (
                             <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200 font-semibold flex items-center gap-1">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 Out of Stock
                             </span>
                        )}
                         {recommendation.inventoryStatus === 'LOW_STOCK' && (
                             <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded border border-orange-200 font-semibold">
                                 Low Stock
                             </span>
                        )}
                        {recommendation.isFinanciallyFeasible === false && (
                             <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-semibold flex items-center gap-1">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>
                                 Check Wallet Balance
                             </span>
                        )}
                    </div>
                    
                    {socialProof && (
                         <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-md w-fit border border-green-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            {socialProof.text}
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleSpeak}
                    className={`p-2 rounded-full hover:bg-white/50 transition-colors ${isPlaying ? 'text-green-600 animate-pulse' : 'text-gray-500'}`}
                    title="Read aloud"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {showReasoning && (
                <div className="mt-3 pt-3 border-t border-gray-200/50 animate-fade-in-down">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Why am I seeing this?</p>
                    <p className="text-sm text-gray-800 italic bg-white/60 p-2 rounded-md border border-gray-200/50">
                        "{recommendation.reasoning}"
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                        <button onClick={onDismiss} className="px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded border border-gray-300">Dismiss</button>
                        <button onClick={onAction} className="px-3 py-1 text-xs font-semibold bg-gray-800 text-white hover:bg-gray-900 rounded shadow-sm">{actionInfo.label}</button>
                    </div>
                </div>
            )}
            
            {!showReasoning && (
                <div className="mt-2 text-center">
                     <button 
                        onClick={() => setShowReasoning(true)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 mx-auto"
                    >
                        See Why & Actions
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default RecommendationCard;
