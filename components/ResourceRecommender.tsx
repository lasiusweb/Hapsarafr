
import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { PartnerModel, PartnerOfferingModel, PartnerInteractionModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { Farmer, FarmPlot } from '../types';
import { formatCurrency } from '../lib/utils';

interface ResourceRecommenderProps {
    farmer: Farmer;
    plots: FarmPlot[];
    currentUser: any;
}

const ResourceRecommender: React.FC<ResourceRecommenderProps> = ({ farmer, plots, currentUser }) => {
    const database = useDatabase();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Fetch Active Partners and their Offerings
    const partners = useQuery(useMemo(() => database.get<PartnerModel>('partners').query(Q.where('status', 'Active'), Q.sortBy('trust_score', 'desc')), [database]));
    const offerings = useQuery(useMemo(() => database.get<PartnerOfferingModel>('partner_offerings').query(), [database]));

    const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p])), [partners]);

    // Intelligence Engine: Filter Offerings based on Context
    const recommendations = useMemo(() => {
        if (partners.length === 0 || offerings.length === 0) return [];

        const farmerDistrict = farmer.district;
        const farmerSoils = new Set(plots.map(p => p.soil_type).filter(Boolean));
        const farmerCrops = new Set([farmer.primary_crop, ...plots.map(p => p.plant_type)].filter(Boolean));

        return offerings.filter(offering => {
            const partner = partnerMap.get(offering.partnerId);
            if (!partner) return false;

            // 1. Region Check
            let regionMatch = true;
            if (offering.regionCodesJson) {
                try {
                    const regions = JSON.parse(offering.regionCodesJson);
                    if (regions.length > 0 && !regions.includes(farmerDistrict)) regionMatch = false;
                } catch (e) {}
            }
            if (!regionMatch) return false;

            // 2. Soil Match (If offering specifies soil types)
            let soilMatch = true; // Default to true if no target specified
            if (offering.targetSoilTypesJson) {
                try {
                    const targetSoils = JSON.parse(offering.targetSoilTypesJson);
                    if (targetSoils.length > 0) {
                        // Check if ANY of farmer's soils match ANY of target soils
                        soilMatch = targetSoils.some((s: string) => farmerSoils.has(s));
                    }
                } catch (e) {}
            }
            if (!soilMatch) return false;

            // 3. Crop Match
            let cropMatch = true;
            if (offering.targetCropsJson) {
                try {
                    const targetCrops = JSON.parse(offering.targetCropsJson);
                    if (targetCrops.length > 0) {
                         // Simple string contains check for MVP flexibility
                         cropMatch = targetCrops.some((target: string) => 
                            Array.from(farmerCrops).some(fc => fc?.toLowerCase().includes(target.toLowerCase()))
                         );
                    }
                } catch (e) {}
            }
            
            return cropMatch;
        }).map(offering => {
            // Determine "Reason" for recommendation
            const reasons = [];
            if (offering.targetSoilTypesJson && JSON.parse(offering.targetSoilTypesJson).some((s: string) => farmerSoils.has(s))) {
                reasons.push("Matches Soil Profile");
            }
            if (offering.targetCropsJson && JSON.parse(offering.targetCropsJson).some((c: string) => Array.from(farmerCrops).some(fc => fc?.toLowerCase().includes(c.toLowerCase())))) {
                reasons.push("For " + farmer.primary_crop);
            }
            if (reasons.length === 0) reasons.push("Available in " + farmerDistrict);

            return {
                offering,
                partner: partnerMap.get(offering.partnerId)!,
                reason: reasons.join(" • ")
            };
        });
    }, [offerings, partners, farmer, plots]);

    const handleConnect = async (rec: { offering: PartnerOfferingModel, partner: PartnerModel }) => {
        setLoadingId((rec.offering as any).id);
        try {
            await database.write(async () => {
                await database.get<PartnerInteractionModel>('partner_interactions').create(i => {
                    i.farmerId = farmer.id;
                    i.partnerId = (rec.partner as any).id;
                    i.offeringId = (rec.offering as any).id;
                    i.interactionType = 'CONNECT';
                    i.timestamp = Date.now();
                    i.tenantId = currentUser.tenantId;
                });
            });
            alert(`Request sent to ${rec.partner.name}. They will contact the farmer shortly.`);
        } catch (e) {
            console.error(e);
            alert("Failed to connect.");
        } finally {
            setLoadingId(null);
        }
    };

    if (recommendations.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Recommended Partners
            </h3>
            <div className="grid grid-cols-1 gap-4">
                {recommendations.map(({ offering, partner, reason }) => (
                    <div key={(offering as any).id} className="bg-white border border-purple-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {partner.logoUrl ? (
                                        <img src={partner.logoUrl} alt={partner.name} className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">{partner.name[0]}</div>
                                    )}
                                    <span className="text-xs font-semibold text-gray-500">{partner.name}</span>
                                </div>
                                {partner.trustScore > 80 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Trusted</span>}
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm">{offering.title}</h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{offering.description}</p>
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded w-fit">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                {reason}
                            </div>
                        </div>
                        <button 
                            onClick={() => handleConnect({ offering, partner })} 
                            disabled={loadingId === (offering as any).id}
                            className="mt-3 w-full py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 transition flex justify-center items-center"
                        >
                            {loadingId === (offering as any).id ? 'Connecting...' : offering.actionLabel}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResourceRecommender;
