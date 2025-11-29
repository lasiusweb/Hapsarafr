


import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { SeedVarietyModel, SeedPerformanceLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { SeedVariety, SeedType, User, ConsentLevel } from '../types';
import CustomSelect from './CustomSelect';
import { GoogleGenAI } from '@google/genai';
import SeedPassport from './SeedPassport';
import { generateSeedPassportHash } from '../lib/genetics';

interface SeedRegistryPageProps {
    onBack: () => void;
    currentUser: User;
}

const SeedCard: React.FC<{ seed: SeedVariety; performanceScore: number; onClick: () => void }> = ({ seed, performanceScore, onClick }) => {
    const isRestricted = !seed.isSeedSavingAllowed;
    return (
        <div onClick={onClick} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
            <div className="h-32 bg-gray-200 relative">
                {seed.imageUrl ? (
                    <img src={seed.imageUrl} alt={seed.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                )}
                 {isRestricted && (
                    <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full border border-red-200">
                        Restricted License
                    </div>
                )}
                <div className="absolute bottom-2 right-2">
                    {seed.consentLevel === ConsentLevel.Green && <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-white"></div>}
                    {seed.consentLevel === ConsentLevel.Yellow && <div className="w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-white"></div>}
                    {seed.consentLevel === ConsentLevel.Red && <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white"></div>}
                </div>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 truncate">{seed.name}</h3>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">{seed.seedType.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 h-10">{seed.description}</p>
                
                <div className="mt-2 pt-2 border-t flex justify-between items-center text-xs">
                    <div className="flex flex-col">
                        <span className="text-gray-500">Maturity</span>
                        <span className="font-semibold">{seed.daysToMaturity} days</span>
                    </div>
                     <div className="flex flex-col items-end">
                        <span className="text-gray-500">Resilience</span>
                        <span className={`font-bold ${performanceScore > 7 ? 'text-green-600' : 'text-yellow-600'}`}>{performanceScore > 0 ? performanceScore.toFixed(1) + '/10' : 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SeedRegistryPage: React.FC<SeedRegistryPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [filterType, setFilterType] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeed, setSelectedSeed] = useState<SeedVariety | null>(null);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

    // Data
    const seeds = useQuery(useMemo(() => database.get<SeedVarietyModel>('seed_varieties').query(Q.sortBy('name', 'asc')), [database]));
    const performanceLogs = useQuery(useMemo(() => database.get<SeedPerformanceLogModel>('seed_performance_logs').query(), [database]));

    const seedScores = useMemo(() => {
        const scores: Record<string, { total: number, count: number }> = {};
        performanceLogs.forEach(log => {
            if (!scores[log.seedVarietyId]) scores[log.seedVarietyId] = { total: 0, count: 0 };
            const logScore = (log.diseaseResistanceScore + log.droughtSurvivalScore) / 2;
            scores[log.seedVarietyId].total += logScore;
            scores[log.seedVarietyId].count++;
        });
        
        const result: Record<string, number> = {};
        seeds.forEach(s => {
            const data = scores[s.id];
            result[s.id] = data ? data.total / data.count : 0;
        });
        return result;
    }, [seeds, performanceLogs]);

    const filteredSeeds = useMemo(() => {
        return seeds.filter(s => {
            if (filterType && s.seedType !== filterType) return false;
            if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [seeds, filterType, searchQuery]);

    // --- Registration Logic ---
    const handleRegistration = async (data: any) => {
        // In a real implementation, this would handle the full creation logic including AI analysis result storage
        try {
            await database.write(async () => {
                const hash = generateSeedPassportHash(data.name, 'Local Village', currentUser.id, {});
                await database.get<SeedVarietyModel>('seed_varieties').create(s => {
                    s.name = data.name;
                    s.seedType = data.seedType;
                    s.daysToMaturity = parseInt(data.daysToMaturity);
                    s.isSeedSavingAllowed = true; // Default for local
                    s.waterRequirement = 'Medium';
                    s.potentialYield = 0; 
                    s.description = data.description;
                    s.consentLevel = ConsentLevel.Yellow; // Default community share
                    s.ownerFarmerId = currentUser.id; // Assuming user is farmer for MVP
                    s.passportHash = hash;
                    s.tenantId = currentUser.tenantId;
                });
            });
            setIsRegistrationOpen(false);
            alert("Seed Passport Issued Successfully!");
        } catch(e) {
            console.error(e);
            alert("Failed to register seed.");
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /></svg>
                            Hapsara Genetica
                        </h1>
                        <p className="text-gray-500">The Open Seed Registry & Ethical Crop Improvement Ecosystem</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsRegistrationOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 text-sm">+ Register New Variety</button>
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 px-4 py-2 rounded-md bg-white">Back</button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3