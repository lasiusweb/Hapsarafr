
import React, { useState, useMemo } from 'react';
import { Farmer } from '../types';
import { getGeoName, formatCurrency } from '../lib/utils';

interface InsigniaCardProps {
    farmer: Farmer;
    onClose: () => void;
}

const TIER_CONFIG = {
    PLATINUM: {
        label: 'Platinum Member',
        bgGradient: 'from-slate-900 via-purple-900 to-slate-900',
        borderColor: 'border-purple-400',
        textColor: 'text-white',
        iconColor: 'text-purple-300',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
        ring: 'ring-purple-500/50'
    },
    GOLD: {
        label: 'Gold Member',
        bgGradient: 'from-yellow-700 via-yellow-600 to-yellow-800',
        borderColor: 'border-yellow-300',
        textColor: 'text-white',
        iconColor: 'text-yellow-200',
        glow: 'shadow-[0_0_30px_rgba(234,179,8,0.4)]',
        ring: 'ring-yellow-400/50'
    },
    SILVER: {
        label: 'Silver Member',
        bgGradient: 'from-slate-400 via-slate-500 to-slate-600',
        borderColor: 'border-slate-300',
        textColor: 'text-white',
        iconColor: 'text-slate-200',
        glow: 'shadow-[0_0_20px_rgba(148,163,184,0.3)]',
        ring: 'ring-slate-400/50'
    },
    BRONZE: {
        label: 'Bronze Member',
        bgGradient: 'from-orange-700 to-orange-900',
        borderColor: 'border-orange-400',
        textColor: 'text-white',
        iconColor: 'text-orange-200',
        glow: 'shadow-xl',
        ring: 'ring-orange-500/30'
    }
};

const InsigniaCard: React.FC<InsigniaCardProps> = ({ farmer, onClose }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Calculate Insignia Tier based on Trust Score & Data
    const tier = useMemo(() => {
        const score = farmer.trustScore || 50;
        if (score >= 90 && farmer.accountVerified) return TIER_CONFIG.PLATINUM;
        if (score >= 75) return TIER_CONFIG.GOLD;
        if (score >= 50) return TIER_CONFIG.SILVER;
        return TIER_CONFIG.BRONZE;
    }, [farmer]);

    const locationString = `${getGeoName('village', farmer)}, ${getGeoName('mandal', farmer)}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div 
                className="relative w-full max-w-[380px] h-[600px] perspective-1000 cursor-pointer group" 
                onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
            >
                <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    
                    {/* --- FRONT OF CARD --- */}
                    <div className={`absolute w-full h-full backface-hidden rounded-3xl border-[1px] ${tier.borderColor} bg-gradient-to-br ${tier.bgGradient} overflow-hidden ${tier.glow} flex flex-col`}>
                        
                        {/* Holographic Overlay Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none"></div>
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>

                        {/* Header */}
                        <div className="p-6 flex justify-between items-start z-10">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${tier.iconColor}`} viewBox="0 0 20 20" fill="currentColor">
                                   <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                </svg>
                                <div>
                                    <h3 className={`font-bold text-lg tracking-wide ${tier.textColor}`}>HAPSARA</h3>
                                    <p className={`text-[10px] uppercase tracking-widest ${tier.iconColor}`}>Insignia Identity</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-mono opacity-70 ${tier.textColor}`}>{farmer.hap_id}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold border border-white/20 rounded-full uppercase ${tier.textColor} bg-white/10`}>
                                    {tier.label}
                                </span>
                            </div>
                        </div>

                        {/* Profile Section */}
                        <div className="flex-1 flex flex-col items-center justify-center z-10">
                            <div className={`relative p-1.5 rounded-full border-2 ${tier.borderColor} ${tier.ring}`}>
                                <img 
                                    src={farmer.photo || `https://ui-avatars.com/api/?name=${farmer.fullName}&background=random`} 
                                    alt="Profile" 
                                    className="w-32 h-32 rounded-full object-cover shadow-2xl border-4 border-black/20"
                                />
                                {farmer.accountVerified && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-4 border-slate-900 shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    </div>
                                )}
                            </div>
                            
                            <h2 className={`mt-6 text-2xl font-bold text-center ${tier.textColor}`}>{farmer.fullName}</h2>
                            <p className={`text-sm opacity-80 ${tier.textColor} flex items-center gap-1 mt-1`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                {locationString}
                            </p>
                        </div>

                        {/* Footer / QR Code Placeholder */}
                        <div className="p-6 z-10 flex justify-between items-end">
                            <div>
                                <p className={`text-[10px] uppercase opacity-60 ${tier.textColor}`}>Member Since</p>
                                <p className={`font-mono text-sm ${tier.textColor}`}>{new Date(farmer.registrationDate).getFullYear()}</p>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg">
                                {/* Mock QR */}
                                <div className="w-12 h-12 bg-black flex items-center justify-center">
                                    <div className="grid grid-cols-3 gap-0.5 w-full h-full p-0.5">
                                        {[...Array(9)].map((_, i) => (
                                            <div key={i} className={`bg-white ${i % 2 === 0 ? 'opacity-100' : 'opacity-0'}`}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] ${tier.textColor} opacity-50 animate-pulse`}>
                            Tap to view details
                        </div>
                    </div>

                    {/* --- BACK OF CARD --- */}
                    <div className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl border-[1px] ${tier.borderColor} bg-slate-900 overflow-hidden shadow-2xl flex flex-col text-white`}>
                         <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Economic Profile</h3>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>

                        <div className="p-8 space-y-6 flex-1">
                             {/* Trust Score Gauge */}
                             <div className="text-center">
                                <div className="relative w-24 h-24 mx-auto">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                        <path className={`${tier === TIER_CONFIG.PLATINUM ? 'text-purple-500' : tier === TIER_CONFIG.GOLD ? 'text-yellow-500' : 'text-blue-500'}`} strokeDasharray={`${farmer.trustScore || 50}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-xl font-bold">{farmer.trustScore || 50}</span>
                                        <span className="text-[8px] uppercase opacity-60">Trust Score</span>
                                    </div>
                                </div>
                             </div>

                             <div className="space-y-3 text-sm">
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="opacity-70">Total Land</span>
                                    <span className="font-semibold">{farmer.approvedExtent || 0} Acres</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="opacity-70">Primary Crop</span>
                                    <span className="font-semibold">{farmer.primary_crop || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                                    <span className="opacity-70">Subsidy Status</span>
                                    <span className="font-semibold text-green-400">Active</span>
                                </div>
                             </div>
                        </div>
                        
                        <div className="p-6 bg-black/20 text-center">
                            <p className="text-[10px] opacity-50">Issued by Hapsara • Immutable Identity</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsigniaCard;
