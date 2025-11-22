
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { User, ActivityType, BillableEvent } from '../types';
import { useDatabase } from '../DatabaseContext';
import { deductCredits } from '../lib/billing';
import { ActivityLogModel, PendingUploadModel } from '../db';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

interface CropHealthScannerPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

interface ScanResult {
    diagnosis: string;
    confidence: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    treatment: string;
}

const CropHealthScannerPage: React.FC<CropHealthScannerPageProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();
    const [image, setImage] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [structuredResult, setStructuredResult] = useState<ScanResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [offlineModel, setOfflineModel] = useState<mobilenet.MobileNet | null>(null);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const isOnline = navigator.onLine;

    // Load TF.js Model for Offline Use
    useEffect(() => {
        const loadModel = async () => {
            setIsModelLoading(true);
            try {
                await tf.ready();
                const model = await mobilenet.load();
                setOfflineModel(model);
                console.log("Offline AI Model Loaded");
            } catch (e) {
                console.error("Failed to load offline model", e);
            } finally {
                setIsModelLoading(false);
            }
        };
        loadModel();
    }, []);

    // Chat state
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

    const analyzeOffline = async (imgElement: HTMLImageElement): Promise<ScanResult> => {
        if (!offlineModel) return { diagnosis: "Offline Model Unavailable", confidence: 0, severity: "LOW", treatment: "Connect to internet." };
        
        const predictions = await offlineModel.classify(imgElement);
        const topPrediction = predictions[0];
        
        // Simple Heuristic for Demo: Since MobileNet detects objects, not crop diseases specifically without transfer learning,
        // we mock the disease logic based on general classification confidence or keywords if coincidentally present.
        // In a real app, we'd load a custom 'graph_model' trained on plant diseases.
        
        const isPlant = topPrediction.className.includes('plant') || topPrediction.className.includes('fruit') || topPrediction.className.includes('vegetable') || topPrediction.className.includes('tree');
        
        return {
            diagnosis: isPlant ? `Potential Issue detected on ${topPrediction.className}` : `Object identified: ${topPrediction.className}`,
            confidence: topPrediction.probability,
            severity: 'MEDIUM', // Default for offline
            treatment: "Basic Offline Advice: Isolate plant, check water levels. Sync when online for full diagnosis."
        };
    };

    const handleAnalyze = async () => {
        if (!image || !imageMimeType) {
            setError('Please select an image first.');
            return;
        }

        setIsLoading(true);
        setAnalysis('');
        setStructuredResult(null);
        setError(null);
        setChat(null);
        setConversation([]);

        // 1. Credit Gate (Optimistic)
        const billingResult = await deductCredits(
            database,
            currentUser.tenantId,
            BillableEvent.CROP_HEALTH_SCAN_COMPLETED,
            { imageMimeType, mode: isOnline ? 'online' : 'offline' }
        );

        if ('error' in billingResult) {
            setError(billingResult.error);
            setNotification({ message: billingResult.error, type: 'error' });
            setIsLoading(false);
            return;
        }
        
        if (billingResult.usedFreeTier) setNotification({ message: 'Free scan used.', type: 'info' });
        else setNotification({ message: '1 credit deducted.', type: 'info' });

        try {
            let resultJson: ScanResult;

            if (isOnline && process.env.API_KEY) {
                // --- ONLINE: Full Gemini Analysis ---
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const imagePart = {
                    inlineData: {
                        data: image.split(',')[1],
                        mimeType: imageMimeType,
                    },
                };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [imagePart, { text: "Analyze this oil palm / crop image. Diagnosis, Confidence (0-1), Severity (LOW/MEDIUM/HIGH), Treatment. JSON." }] },
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                diagnosis: { type: Type.STRING },
                                confidence: { type: Type.NUMBER },
                                severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                                treatment: { type: Type.STRING },
                            },
                            required: ['diagnosis', 'confidence', 'severity', 'treatment']
                        }
                    }
                });
                resultJson = JSON.parse(response.text);

                // Setup Chat
                const chatSession = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: [
                        { role: "user", parts: [imagePart, { text: "Analyze this image." }] },
                        { role: "model", parts: [{ text: `Diagnosis: ${resultJson.diagnosis}. ${resultJson.treatment}` }] }
                    ],
                });
                setChat(chatSession);

            } else {
                // --- OFFLINE: TF.js ---
                const imgElement = document.createElement('img');
                imgElement.src = image;
                await new Promise(resolve => { imgElement.onload = resolve; });
                
                resultJson = await analyzeOffline(imgElement);
                
                // Queue Image for Sync
                await database.write(async () => {
                    await database.get<PendingUploadModel>('pending_uploads').create(p => {
                        p.filePath = `offline_scan_${Date.now()}.jpg`; // Placeholder logic
                        p.relatedRecordId = 'unknown'; // No farmer context here
                        p.relatedTable = 'activity_logs';
                        p.status = 'pending';
                        p.blobData = image.split(',')[1]; // Storing base64 temporarily
                        p.createdAt = new Date();
                    });
                });
                setNotification({ message: "Analyzed offline. Result saved & image queued for sync.", type: 'info' });
            }
            
            setStructuredResult(resultJson);
            setAnalysis(resultJson.treatment);
            
            // Log Activity
            await database.write(async () => {
                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = 'unknown';
                    log.activityType = 'CROP_HEALTH_SCAN_COMPLETED';
                    log.description = `Scan: ${resultJson.diagnosis} (${resultJson.severity}) [${isOnline ? 'Online' : 'Offline'}]`;
                    log.metadataJson = JSON.stringify(resultJson);
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });

        } catch (err: any) {
            console.error("Analysis error:", err);
            setError("Failed to analyze image.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // ... (Camera logic same as before) ...
    const handleUseCamera = async () => {
        try {
            handleClear();
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setIsCameraOn(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError("Could not access the camera.");
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
        setStructuredResult(null);
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
             setConversation(prev => [...prev, { role: 'model', text: "Error getting response." }]);
        } finally {
            setIsReplying(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch(severity) {
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Crop Health Scanner</h1>
                        <p className="text-gray-500 flex items-center gap-2">
                            {isOnline ? <span className="text-green-600">● Online (Gemini 2.5)</span> : <span className="text-orange-600">● Offline (On-Device AI)</span>}
                        </p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back
                    </button>
                </div>
                
                <div className="bg-white rounded-lg shadow-xl p-8">
                    {!image && !isCameraOn && (
                         <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
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
                                    <img src={image} alt="Crop preview" className="rounded-lg shadow-md w-full" />
                                </div>
                                <div className="lg:w-1/2 flex flex-col">
                                     <button onClick={handleAnalyze} disabled={isLoading || !!structuredResult || isModelLoading} className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-green-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isLoading ? 'Analyzing...' : isModelLoading ? 'Loading AI Model...' : (structuredResult ? 'Analysis Complete' : `Analyze (${isOnline ? '1 Cr' : 'Offline'})`)}
                                    </button>
                                     {error && <p className="mt-4 text-center text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                                    
                                    {structuredResult && (
                                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-xl font-bold text-gray-800">{structuredResult.diagnosis}</h3>
                                                <span className={`px-2 py-1 text-xs font-bold rounded border ${getSeverityColor(structuredResult.severity)}`}>
                                                    {structuredResult.severity} RISK
                                                </span>
                                            </div>
                                            
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Confidence Score</span>
                                                    <span>{(structuredResult.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${structuredResult.confidence > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${structuredResult.confidence * 100}%` }}></div>
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-700 font-semibold mb-1">Recommended Action:</p>
                                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                                {structuredResult.treatment}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {chat && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Ask AI Assistant</h3>
                                    <div className="space-y-4 max-h-64 overflow-y-auto p-4 bg-gray-100 rounded-md border">
                                        {conversation.map((msg, index) => (
                                            <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                                <div className={`flex flex-col max-w-xs md:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                                    <p className="text-sm">{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {isReplying && <div className="text-xs text-gray-500 animate-pulse">AI is typing...</div>}
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
