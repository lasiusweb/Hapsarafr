import React, { useState, useEffect } from 'react';
import { Farmer } from '../types';
import { GoogleGenAI } from '@google/genai';
import { getGeoName } from '../lib/utils';

interface AiReviewModalProps {
    farmerData: Partial<Farmer>;
    onClose: () => void;
}

const AiReviewModal: React.FC<AiReviewModalProps> = ({ farmerData, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [review, setReview] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReview = async () => {
            setIsLoading(true);
            setError(null);
            
            if (!process.env.API_KEY) {
                setError("Gemini API key is not configured. Please set the API_KEY environment variable.");
                setIsLoading(false);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const prompt = `
                    You are an expert agricultural data verification assistant for India's Oil Palm Mission.
                    Analyze the following farmer registration data for potential errors, inconsistencies, or areas for improvement.
                    Focus on logical issues (e.g., number of plants vs. land area, invalid IFSC format, dates).
                    Provide your feedback as a concise, user-friendly, bulleted list of actionable suggestions or warnings. Use a '*' for bullet points.
                    If the data looks good, state that clearly and positively.

                    Data to review:
                    - Full Name: ${farmerData.fullName || 'Not Provided'}
                    - Mobile Number: ${farmerData.mobileNumber || 'Not Provided'}
                    - Aadhaar Number (last 4 digits): ${farmerData.aadhaarNumber?.slice(-4) || 'Not Provided'}
                    - Bank Account Number: ${farmerData.bankAccountNumber || 'Not Provided'}
                    - IFSC Code: ${farmerData.ifscCode || 'Not Provided'}
                    - Applied Extent (Acres): ${farmerData.appliedExtent ?? 'Not Provided'}
                    - Approved Extent (Acres): ${farmerData.approvedExtent ?? 'Not Provided'}
                    - Number of Plants: ${farmerData.numberOfPlants ?? 'Not Provided'}
                    - District: ${getGeoName('district', { district: farmerData.district! })}
                    - Mandal: ${getGeoName('mandal', { district: farmerData.district!, mandal: farmerData.mandal! })}
                    - Village: ${getGeoName('village', { district: farmerData.district!, mandal: farmerData.mandal!, village: farmerData.village! })}
                    - Plantation Date: ${farmerData.plantationDate || 'Not Provided'}
                    - Registration Date: ${farmerData.registrationDate || 'Not Provided'}

                    Your feedback:
                `;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setReview(response.text);

            } catch (err: any) {
                console.error("Gemini API error:", err);
                setError("Could not get a review from the AI assistant. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchReview();
    }, [farmerData]);
    
    const formatReview = (text: string) => {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
                if (line.startsWith('* ') || line.startsWith('- ')) {
                    return (
                        <li key={index} className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span>{line.substring(2)}</span>
                        </li>
                    );
                }
                return <p key={index}>{line}</p>;
            });
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center gap-4">
                     <div className="p-2 bg-green-100 rounded-full">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">AI Data Assistant</h2>
                        <p className="text-sm text-gray-500">Powered by Gemini</p>
                    </div>
                </div>
                <div className="p-6 min-h-[200px]">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center text-gray-500">
                             <svg className="animate-spin h-8 w-8 text-green-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="font-semibold">Analyzing data...</p>
                        </div>
                    )}
                    {error && (
                        <div className="text-center text-red-600 bg-red-50 p-4 rounded-md">
                            <p className="font-bold">An Error Occurred</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && (
                         <div className="space-y-3 text-gray-700">
                            <ul className="space-y-3">{formatReview(review)}</ul>
                        </div>
                    )}
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiReviewModal;