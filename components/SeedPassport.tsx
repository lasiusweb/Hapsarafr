
import React, { useState } from 'react';
import { SeedVariety, ConsentLevel } from '../types';
import { generateVisualFingerprint } from '../lib/genetics';
import { useDatabase } from '../DatabaseContext';
import { SeedVarietyModel } from '../db';

interface SeedPassportProps {
    seed: SeedVariety;
    onClose: () => void;
    isEditable: boolean;
}

const TrafficLightToggle: React.FC<{ currentLevel: ConsentLevel; onChange: (level: ConsentLevel) => void; disabled: boolean }> = ({ currentLevel, onChange, disabled }) => {
    return (
        <div className="flex gap-4 items-center justify-center bg-gray-100 p-3 rounded-full border border-gray-200 shadow-inner">
            <button 
                onClick={() => !disabled && onChange(ConsentLevel.Red)}
                className={`w-12 h-12 rounded-full border-4 transition-all transform ${currentLevel === ConsentLevel.Red ? 'bg-red-500 border-red-200 scale-110 shadow-lg ring-2 ring-red-400' : 'bg-red-200 border-transparent opacity-50'}`}
                title="Private: Only for me"
            >
                <span className="sr-only">Private</span>
            </button>
            <button 
                onClick={() => !disabled && onChange(ConsentLevel.Yellow)}
                className={`w-12 h-12 rounded-full border-4 transition-all transform ${currentLevel === ConsentLevel.Yellow ? 'bg-yellow-400 border-yellow-200 scale-110 shadow-lg ring-2 ring-yellow-300' : 'bg-yellow-200 border-transparent opacity-50'}`}
                title="Community: Share with neighbors"
            >
                 <span className="sr-only">Community</span>
            </button>
            <button 
                onClick={() => !disabled && onChange(ConsentLevel.Green)}
                className={`w-12 h-12 rounded-full border-4 transition-all transform ${currentLevel === ConsentLevel.Green ? 'bg-green-500 border-green-200 scale-110 shadow-lg ring-2 ring-green-400' : 'bg-green-200 border-transparent opacity-50'}`}
                title="Global: Open for Research"
            >
                 <span className="sr-only">Global</span>
            </button>
        </div>
    );
};

const SeedPassport: React.FC<SeedPassportProps> = ({ seed, onClose, isEditable }) => {
    const database = useDatabase();
    const [consent, setConsent] = useState<ConsentLevel>(seed.consentLevel || ConsentLevel.Red);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const handleConsentChange = async (newLevel: ConsentLevel) => {
        setConsent(newLevel);
        // Persist change
        try {
             await database.write(async () => {
                const seedRecord = await database.get<SeedVarietyModel>('seed_varieties').find(seed.id);
                await seedRecord.update(s => {
                    s.consentLevel = newLevel;
                });
             });
        } catch (e) {
            console.error("Failed to update consent", e);
        }
    };

    const fingerprint = generateVisualFingerprint(seed.passportHash || seed.id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-4 border-amber-100" onClick={e => e.stopPropagation()}>
                {/* Header / ID Card Look */}
                <div className="bg-gradient-to-br from-green-800 to-emerald-900 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                    <div className="flex justify-between items-start">
                        <div>
                             <h2 className="text-2xl font-serif font-bold tracking-wide">HAPSARA GENETICA</h2>
                             <p className="text-xs text-green-200 uppercase tracking-widest mt-1">Seed Sovereign Identity</p>
                        </div>
                        <div className="text-right">
                             <p className="font-mono text-sm opacity-80">{seed.passportHash || 'PENDING-HASH'}</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex gap-4">
                        <div className="w-24 h-24 bg-white p-1 rounded-md shadow-lg flex-shrink-0">
                            {seed.imageUrl ? (
                                <img src={seed.imageUrl} className="w-full h-full object-cover rounded" alt="Seed" />
                            ) : (
                                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs text-center">No Photo</div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{seed.name}</h1>
                            <p className="text-green-200 text-sm">{seed.scientificName || 'Species Unknown'}</p>
                            <p className="text-xs mt-2 bg-green-900/50 px-2 py-1 rounded inline-block border border-green-700/50">
                                Origin: {seed.originVillage || 'Unknown Village'}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* DNA Fingerprint Visualization */}
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold mb-2 tracking-wide text-center">Genetic Fingerprint (Simulated)</p>
                        <div className="flex h-4 rounded-md overflow-hidden">
                            {fingerprint.map((color, idx) => (
                                <div key={idx} className="flex-1" style={{ backgroundColor: color }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Data Sovereignty Control */}
                    <div className="text-center">
                        <p className="text-sm font-bold text-gray-700 mb-3">Data Sovereignty Control</p>
                        <TrafficLightToggle currentLevel={consent} onChange={handleConsentChange} disabled={!isEditable} />
                        <p className="text-xs text-gray-500 mt-2">
                            {consent === ConsentLevel.Red && "Private: Data is encrypted and stored locally."}
                            {consent === ConsentLevel.Yellow && "Community: Visible to local farmers for exchange."}
                            {consent === ConsentLevel.Green && "Global: Open for research agreements."}
                        </p>
                    </div>

                    {/* Oral History */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <div className="flex justify-between items-center">
                            <h3 className="font-serif font-bold text-amber-900">Oral History</h3>
                            <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                disabled={!seed.oralHistoryUrl}
                                className={`p-2 rounded-full ${seed.oralHistoryUrl ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-gray-200 text-gray-400'}`}
                            >
                                {isPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-amber-800 mt-2 italic">
                            {seed.oralHistoryUrl ? "Listen to the story of this seed's origin." : "No oral history recorded."}
                        </p>
                        {/* Mock Audio Visualization */}
                        {isPlaying && (
                             <div className="mt-3 flex items-center justify-center gap-1 h-4">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="w-1 bg-amber-600 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: '0.5s' }}></div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <button onClick={onClose} className="text-sm font-bold text-gray-600 hover:text-gray-900">Close Passport</button>
                </div>
            </div>
        </div>
    );
};

export default SeedPassport;
