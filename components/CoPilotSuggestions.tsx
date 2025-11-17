import React, { useState, useCallback } from 'react';
// FIX: The 'Plot' type is not exported from 'types'. It should be 'FarmPlot'. Aliasing 'FarmPlot' as 'Plot' to avoid further changes in the component.
import { Farmer, FarmPlot as Plot } from '../types';
import { GoogleGenAI } from '@google/genai';

interface CoPilotSuggestionsProps {
    farmer: Farmer;
    plots: Plot[];
}

const CoPilotSuggestions: React.FC<CoPilotSuggestionsProps> = ({ farmer, plots }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchSuggestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuggestions(null);

        if (!process.env.API_KEY) {
            setError("HapsaraAI API key is not configured.");
            setIsLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const farmerDataContext = JSON.stringify({
                status: farmer.status,
                registrationDate: farmer.registrationDate,
                accountVerified: farmer.accountVerified,
                plots: plots.map(p => ({ acreage: p.acreage, numberOfPlants: p.number_of_plants, plantationDate: p.plantation_date })),
            });

            const prompt = `
                You are Hapsara CoPilot, an expert AI assistant for an agricultural Field Officer.
                Analyze the following data for a specific farmer and provide a concise, bulleted list of "Next Step Recommendations".
                Focus on actionable insights based on the farmer's current status and data.
                
                Farmer Data:
                ${farmerDataContext}
                
                Guidelines for your recommendations:
                - If the bank account is not verified, this is a high priority.
                - If the farmer is "Registered" and has plots but no plantation date, suggest a follow-up to check on planting progress.
                - If the farmer is "Planted" for more than a year, check if they are eligible for their next maintenance subsidy based on the plot's plantation date.
                - Analyze plant density (standard is 57 plants/acre). If it's too high or low, suggest a verification visit.
                - Keep suggestions short and to the point. Start each with an action verb.
                - If there are no obvious issues or next steps, state that the farmer's record is up-to-date and looks good.
                
                Format the output as a simple markdown bulleted list, with each item starting with '* '.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setSuggestions(response.text);

        } catch (err: any) {
            console.error("Gemini API error:", err);
            setError("Could not generate suggestions. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, [farmer, plots]);

    const renderMarkdown = (text: string) => {
        const listItems = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('* ') || line.startsWith('- '));
        
        if(listItems.length === 0 && text.length > 0) {
            return `<p>${text}</p>`;
        }
            
        return listItems.map(line => `<li class="flex items-start gap-3"><svg class="h-5 w-5 text-green-500 flex-shrink-0 mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg><span>${line.substring(2)}</span></li>`)
            .join('');
    };

    return (
        <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">CoPilot Recommendations</h3>
            <p className="text-sm text-gray-500 mb-6">Get AI-powered suggestions for this farmer's next steps.</p>

            {!suggestions && !isLoading && !error && (
                <button
                    onClick={fetchSuggestions}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition flex items-center gap-2 mx-auto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2l4.45 1.18a1 1 0 01.548 1.564l-3.6 3.296 1.056 4.882a1 1 0 01-1.479 1.054L12 16.222l-4.12 2.85a1 1 0 01-1.479-1.054l1.056-4.882-3.6-3.296a1 1 0 01.548-1.564L8.854 7.2 10.033 2.744A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                    Analyze Farmer Data
                </button>
            )}

            {isLoading && (
                 <div className="flex flex-col items-center justify-center text-center text-gray-500 h-40">
                     <svg className="animate-spin h-8 w-8 text-green-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="font-semibold">CoPilot is thinking...</p>
                </div>
            )}
            {error && (
                <div className="text-center text-red-600 bg-red-50 p-4 rounded-md">
                    <p className="font-bold">An Error Occurred</p>
                    <p>{error}</p>
                </div>
            )}
            {suggestions && (
                <div className="mt-6 text-left bg-gray-50 p-6 rounded-lg border">
                    <ul className="space-y-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestions) }} />
                    <button onClick={fetchSuggestions} className="mt-6 text-sm font-semibold text-blue-600 hover:underline">
                        Regenerate Suggestions
                    </button>
                </div>
            )}
        </div>
    );
};
export default CoPilotSuggestions;