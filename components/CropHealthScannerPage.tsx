import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

interface CropHealthScannerPageProps {
    onBack: () => void;
}

const CropHealthScannerPage: React.FC<CropHealthScannerPageProps> = ({ onBack }) => {
    const [image, setImage] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);

    // New state for chat functionality
    const [chat, setChat] = useState<Chat | null>(null);
    const [conversation, setConversation] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleClear();
                setImage(reader.result as string);
                setImageMimeType(file.type);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image || !imageMimeType) {
            setError('Please select an image first.');
            return;
        }

        if (!process.env.API_KEY) {
            setError("Gemini API key is not configured. An administrator needs to set the API_KEY environment variable.");
            return;
        }

        setIsLoading(true);
        setAnalysis('');
        setError(null);
        setChat(null);
        setConversation([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const imagePart = {
                inlineData: {
                    data: image.split(',')[1],
                    mimeType: imageMimeType,
                },
            };

            const initialPrompt = `
                You are an expert agricultural botanist specializing in oil palm (Elaeis guineensis).
                Analyze the provided image of an oil palm plant/leaf.
                Identify any potential diseases, pests, nutrient deficiencies, or other health issues.
                Provide a structured analysis with the following sections:
                - **Observation:** A brief description of what you see in the image.
                - **Potential Diagnosis:** A list of possible issues, each with a confidence score (e.g., High, Medium, Low).
                - **Recommendations:** Actionable advice for the farmer to address the identified issues. Suggest specific treatments if possible.
                - **Disclaimer:** Include a brief disclaimer that this is an AI analysis and a professional human consultation is recommended for confirmation.
                
                If the plant appears healthy, state that clearly and offer general care tips. Format your response using markdown.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: initialPrompt }] },
            });
            
            const initialAnalysis = response.text;
            setAnalysis(initialAnalysis);
            
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: [
                    { role: "user", parts: [imagePart, { text: "Analyze this image of an oil palm plant and give me a report on its health." }] },
                    { role: "model", parts: [{ text: initialAnalysis }] }
                ],
            });
            setChat(chatSession);

        } catch (err: any) {
            console.error("Gemini API error:", err);
            setError("Failed to analyze image. The AI model may be temporarily unavailable or there could be an issue with the API key.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUseCamera = async () => {
        try {
            handleClear();
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setIsCameraOn(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError("Could not access the camera. Please ensure you have given permission in your browser settings.");
        }
    };
    
    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            if(context) {
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setImage(dataUrl);
                setImageMimeType('image/jpeg');
                stopCamera();
            }
        }
    };
    
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
    };

    const handleClear = () => {
        setImage(null);
        setAnalysis('');
        setError(null);
        setChat(null);
        setConversation([]);
        setUserInput('');
        stopCamera();
    };
    
    const handleSendFollowUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !chat || isReplying) return;

        const question = userInput.trim();
        setIsReplying(true);
        setUserInput('');
        setConversation(prev => [...prev, { role: 'user', text: question }]);

        try {
            const response = await chat.sendMessage({ message: question });
            const answer = response.text;
            setConversation(prev => [...prev, { role: 'model', text: answer }]);
        } catch (err: any) {
             console.error("Gemini follow-up error:", err);
             setConversation(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsReplying(false);
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
                return line ? `<p class="my-2">${line}</p>` : '';
            })
            .join('');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Crop Health Scanner</h1>
                        <p className="text-gray-500">Analyze oil palm images for potential health issues using AI.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-xl p-8">
                    {!image && !isCameraOn && (
                         <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">Get Started</h2>
                            <p className="text-gray-500 mb-6">Upload a photo from your device or use your camera to take a new one.</p>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <div className="flex justify-center gap-4">
                                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">Upload Image</button>
                                <button onClick={handleUseCamera} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Use Camera</button>
                            </div>
                        </div>
                    )}
                    
                    {isCameraOn && (
                         <div className="flex flex-col items-center">
                            <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg rounded-md border bg-gray-900"></video>
                            <div className="mt-4 flex gap-4">
                                <button onClick={handleCapture} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">Capture</button>
                                <button onClick={stopCamera} className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">Cancel</button>
                            </div>
                        </div>
                    )}
                    
                    {image && !isCameraOn && (
                        <div className="space-y-6">
                            <div className="flex flex-col lg:flex-row gap-8">
                                <div className="lg:w-1/2">
                                    <h2 className="text-xl font-bold text-gray-800 mb-2">Image Preview</h2>
                                    <img src={image} alt="Crop preview" className="rounded-lg shadow-md w-full" />
                                </div>
                                <div className="lg:w-1/2 flex flex-col">
                                    <h2 className="text-xl font-bold text-gray-800 mb-2">AI Analysis</h2>
                                     <button onClick={handleAnalyze} disabled={isLoading || !!analysis} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isLoading ? (
                                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                                        )}
                                        <span>{isLoading ? 'Analyzing...' : (analysis ? 'Analysis Complete' : 'Analyze with AI')}</span>
                                    </button>
                                     {error && <p className="mt-4 text-center text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                                    {analysis && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                            <strong>Coming Soon:</strong> Track crop health over time! In a future update, you'll be able to upload a series of images to monitor disease progression or recovery.
                                        </div>
                                    )}
                                    {analysis && !isLoading && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border flex-1 overflow-y-auto max-h-[500px]">
                                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(analysis) }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {chat && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Follow-up Conversation</h3>
                                    <div className="space-y-4 max-h-64 overflow-y-auto p-4 bg-gray-100 rounded-md border">
                                        {conversation.map((msg, index) => (
                                            <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                                <div className={`flex flex-col max-w-xs md:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                                    <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }}></div>
                                                </div>
                                            </div>
                                        ))}
                                        {isReplying && (
                                            <div className="flex items-start gap-2.5">
                                                <div className="flex flex-col max-w-xs p-3 rounded-lg bg-gray-200 rounded-bl-none">
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
                                    <form onSubmit={handleSendFollowUp} className="mt-4 flex gap-2">
                                        <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Ask a follow-up question..." className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" disabled={isReplying} />
                                        <button type="submit" disabled={isReplying || !userInput.trim()} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300">Send</button>
                                    </form>
                                </div>
                            )}

                             <div className="mt-6 pt-6 border-t text-center">
                                <button onClick={handleClear} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold text-sm">Start Over</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CropHealthScannerPage;