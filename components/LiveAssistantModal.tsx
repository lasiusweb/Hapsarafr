import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { Farmer } from '../types';

// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- CoPilot Function Declarations ---
const suggestActionFunction: FunctionDeclaration = {
  name: 'suggestAction',
  parameters: {
    type: Type.OBJECT,
    description: 'Displays a clickable suggestion to the Field Officer in the UI.',
    properties: {
      action_name: {
        type: Type.STRING,
        description: 'A unique identifier for the action (e.g., "SHOW_PROFIT_SIMULATOR", "CHECK_PEST_ALERT").'
      },
      reason: {
        type: Type.STRING,
        description: 'A short, compelling reason for the suggestion that will be shown to the officer.'
      }
    },
    required: ['action_name', 'reason']
  }
};

interface LiveAssistantModalProps {
    farmer: Farmer;
    onClose: () => void;
    onExecuteAction: (actionName: string) => void;
}

type TranscriptItem = { id: number; role: 'user' | 'model'; text: string; isFinal: boolean };
type Suggestion = { id: string; name: string; args: { action_name: string; reason: string } };

const LiveAssistantModal: React.FC<LiveAssistantModalProps> = ({ farmer, onClose, onExecuteAction }) => {
    const [status, setStatus] = useState<'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR' | 'CLOSED'>('CONNECTING');
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const audioResourcesRef = useRef<{
        stream: MediaStream | null;
        inputAudioContext: AudioContext | null;
        outputAudioContext: AudioContext | null;
        scriptProcessor: ScriptProcessorNode | null;
        sources: Set<AudioBufferSourceNode>;
        nextStartTime: number;
    }>({ stream: null, inputAudioContext: null, outputAudioContext: null, scriptProcessor: null, sources: new Set(), nextStartTime: 0 });

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    useEffect(() => {
        let isCancelled = false;
        
        const setupAudio = async () => {
            if (!process.env.API_KEY) {
                setError("HapsaraAI API key is not configured.");
                setStatus('ERROR');
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (isCancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                
                const audioRes = audioResourcesRef.current;
                audioRes.stream = stream;
                audioRes.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                audioRes.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const farmerDataContext = JSON.stringify({
                    id: farmer.id,
                    fullName: farmer.fullName,
                    status: farmer.status,
                    registrationDate: farmer.registrationDate,
                    approvedExtent: farmer.approvedExtent,
                    numberOfPlants: farmer.numberOfPlants,
                    location: `${farmer.village}, ${farmer.mandal}, ${farmer.district}`
                });

                const systemInstruction = `You are Hapsara CoPilot, an expert AI assistant for a Field Officer visiting a farmer. Your goal is to help the officer be more effective. You will receive a JSON object with the farmer's data and a real-time transcript of the conversation. Based on the data and conversation keywords (like "fertilizer", "cost", "yellow leaves", "pests"), proactively use the 'suggestAction' tool to provide helpful, timely suggestions to the officer in the UI. Also, respond conversationally to the officer's direct questions. The farmer data is: ${farmerDataContext}`;

                sessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                        systemInstruction: systemInstruction,
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        tools: [{ functionDeclarations: [suggestActionFunction] }],
                    },
                    callbacks: {
                        onopen: () => {
                            if (isCancelled) return;
                            setStatus('LISTENING');
                            const source = audioRes.inputAudioContext!.createMediaStreamSource(stream);
                            audioRes.scriptProcessor = audioRes.inputAudioContext!.createScriptProcessor(4096, 1, 1);
                            
                            audioRes.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(audioRes.scriptProcessor);
                            audioRes.scriptProcessor.connect(audioRes.inputAudioContext!.destination);
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (isCancelled) return;
                            
                            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                                setStatus('SPEAKING');
                                const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                                const outputCtx = audioRes.outputAudioContext!;
                                audioRes.nextStartTime = Math.max(audioRes.nextStartTime, outputCtx.currentTime);
                                
                                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                                const source = outputCtx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputCtx.destination);
                                source.addEventListener('ended', () => { audioRes.sources.delete(source); if (audioRes.sources.size === 0) setStatus('LISTENING'); });
                                
                                source.start(audioRes.nextStartTime);
                                audioRes.nextStartTime += audioBuffer.duration;
                                audioRes.sources.add(source);
                            }

                            if (message.toolCall?.functionCalls) {
                                setSuggestions(prev => [...prev, ...message.toolCall.functionCalls]);
                            }

                            if (message.serverContent?.inputTranscription) {
                                const { text, isFinal } = message.serverContent.inputTranscription;
                                setTranscript(prev => {
                                    const last = prev[prev.length - 1];
                                    if (last && last.role === 'user' && !last.isFinal) {
                                        return [...prev.slice(0, -1), { ...last, text: last.text + text, isFinal }];
                                    }
                                    return [...prev, { id: Date.now(), role: 'user', text, isFinal }];
                                });
                            }

                            if (message.serverContent?.outputTranscription) {
                                const { text, isFinal } = message.serverContent.outputTranscription;
                                 setTranscript(prev => {
                                    const last = prev[prev.length - 1];
                                    if (last && last.role === 'model' && !last.isFinal) {
                                        return [...prev.slice(0, -1), { ...last, text: last.text + text, isFinal }];
                                    }
                                    return [...prev, { id: Date.now(), role: 'model', text, isFinal }];
                                });
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            console.error('Live session error:', e);
                            setError('A connection error occurred.');
                            setStatus('ERROR');
                        },
                        onclose: () => {
                            if (!isCancelled) setStatus('CLOSED');
                        },
                    },
                });

            } catch (err) {
                console.error("Setup failed:", err);
                setError("Could not access microphone. Please grant permission.");
                setStatus('ERROR');
            }
        };

        setupAudio();

        return () => {
            isCancelled = true;
            sessionPromiseRef.current?.then(s => s.close());
            const audioRes = audioResourcesRef.current;
            audioRes.stream?.getTracks().forEach(track => track.stop());
            audioRes.scriptProcessor?.disconnect();
            audioRes.inputAudioContext?.close();
            audioRes.outputAudioContext?.close();
        };
    }, []);
    
    const handleSuggestionClick = (suggestion: Suggestion) => {
        // Execute the action in the parent component
        onExecuteAction(suggestion.args.action_name);
        
        // Inform the model the function was "called"
        sessionPromiseRef.current?.then(session => {
            session.sendToolResponse({
                functionResponses: {
                    id: suggestion.id,
                    name: suggestion.name,
                    response: { result: "ok, action has been triggered in the UI." },
                }
            });
        });

        // Remove the suggestion from the UI
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    };

    const StatusIndicator = () => {
        const iconStyles = "h-10 w-10 text-white";
        switch (status) {
            case 'CONNECTING': return <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>;
            case 'LISTENING': return <svg xmlns="http://www.w3.org/2000/svg" className={`${iconStyles} animate-pulse`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>;
            case 'SPEAKING': return <svg xmlns="http://www.w3.org/2000/svg" className={iconStyles} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 12.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>;
            default: return <svg xmlns="http://www.w3.org/2000/svg" className={iconStyles} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-800 text-white rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <StatusIndicator />
                        <div>
                            <h2 className="text-xl font-bold">Hapsara CoPilot</h2>
                            <p className="text-sm text-gray-300">
                                {status === 'LISTENING' ? `Listening... | Farmer: ${farmer.fullName}` : status}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-2/3 border-r flex flex-col bg-gray-50">
                        <div className="p-4 border-b bg-white">
                             <h3 className="font-bold text-gray-700">Live Transcript</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {error && <div className="p-4 bg-red-100 text-red-800 rounded-md text-center">{error}</div>}
                            {transcript.map((item) => (
                                <div key={item.id} className={`flex items-start gap-2.5 ${item.role === 'user' ? 'justify-end' : ''}`}>
                                    <div className={`flex flex-col max-w-lg p-3 rounded-lg ${item.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'} ${!item.isFinal ? 'opacity-70' : ''}`}>
                                        <p>{item.text}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                    </div>
                    <div className="w-1/3 flex flex-col">
                         <div className="p-4 border-b bg-white">
                             <h3 className="font-bold text-gray-700">CoPilot Suggestions</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
                            {suggestions.map(suggestion => (
                                <button key={suggestion.id} onClick={() => handleSuggestionClick(suggestion)} className="w-full text-left p-4 bg-white rounded-lg shadow-md hover:shadow-lg hover:border-green-300 border border-transparent transition-all">
                                    <p className="font-semibold text-blue-600">Suggestion:</p>
                                    <p className="text-sm text-gray-800">{suggestion.args.reason}</p>
                                </button>
                            ))}
                            {suggestions.length === 0 && (
                                <div className="text-center text-gray-500 pt-10">
                                    <p>Suggestions from the AI will appear here during your conversation.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg border-t">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold">End Session</button>
                </div>
            </div>
        </div>
    );
};

export default LiveAssistantModal;