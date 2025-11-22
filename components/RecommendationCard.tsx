
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
    
    const confidence = recommendation.confidenceScore || 0;
    
    // Determine Confidence Badge
    let confidenceColor = 'bg-gray-100 text-gray-600';
    let confidenceLabel = 'Unverified';
    
    if (confidence > 80) {
        confidenceColor = 'bg-green-100 text-green-800 border-green-200';
        confidenceLabel = 'High Confidence';
    } else if (confidence > 50) {
        confidenceColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        confidenceLabel = 'Moderate Confidence';
    } else {
        confidenceColor = 'bg-red-50 text-red-700 border-red-100';
        confidenceLabel = 'Low Confidence (Verify)';
    }

    // Parse action info
    let actionInfo = { label: 'Take Action' };
    if (recommendation.actionJson) {
         try {
            const parsed = JSON.parse(recommendation.actionJson);
            if(parsed.label) actionInfo.label = parsed.label;
        } catch (e) { /* ignore */ }
    }

    // Parse social proof
    let socialProof = null;
    if (recommendation.socialProofJson) {
        try { socialProof = JSON.parse(recommendation.socialProofJson); } catch (e) {}
    }

    const handleSpeak = () => {
        const msg = new SpeechSynthesisUtterance(`${recommendation.title}. ${recommendation.description}`);
        window.speechSynthesis.speak(msg);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4 hover:shadow-md transition-shadow">
            {/* Header: Confidence & Type */}
            <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-100">
                <div className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border flex items-center gap-1 ${confidenceColor}`}>
                    {confidence > 80 && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                    {confidenceLabel} ({confidence}%)
                </div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{recommendation.type.replace('_', ' ')}</span>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 text-lg">{recommendation.title}</h4>
                     <button onClick={handleSpeak} className="text-gray-400 hover:text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                <p className="text-gray-600 text-sm mt-1">{recommendation.description}</p>

                {/* Evidence / Source */}
                <div className="mt-3 text-xs text-gray-500 flex flex-col gap-1">
                    {recommendation.scientificSource && (
                        <p className="flex items-center gap-1">
                            <span className="font-semibold text-blue-700">Source:</span> {recommendation.scientificSource}
                        </p>
                    )}
                    {socialProof && (
                         <p className="flex items-center gap-1 text-green-700">
                            <span className="font-semibold">Community:</span> {socialProof.text}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                     <button onClick={() => setShowReasoning(!showReasoning)} className="text-xs text-blue-600 font-semibold hover:underline">
                        {showReasoning ? 'Hide Logic' : 'Why this?'}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onDismiss} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded border">Ignore</button>
                        <button onClick={onAction} className="px-3 py-1.5 text-xs bg-green-600 text-white font-bold rounded hover:bg-green-700 shadow-sm">
                            {actionInfo.label}
                        </button>
                    </div>
                </div>
                
                {showReasoning && (
                    <div className="mt-3 bg-blue-50 p-3 rounded text-xs text-blue-800 border border-blue-100">
                        <strong>Analysis Logic:</strong> {recommendation.reasoning}
                        {confidence < 50 && <p className="mt-1 text-red-600 font-bold">Warning: Low data availability. Verify on ground.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecommendationCard;
