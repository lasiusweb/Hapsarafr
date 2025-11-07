import { Farmer } from '../types';
import { FarmerModel } from '../db';
import { GEO_DATA } from '../data/geoData';

// --- Farmer Data Conversion ---
export const farmerModelToPlain = (f: FarmerModel | null): Farmer | null => {
    if (!f) return null;
    return {
        id: f.id,
        fullName: f.fullName,
        fatherHusbandName: f.fatherHusbandName,
        aadhaarNumber: f.aadhaarNumber,
        mobileNumber: f.mobileNumber,
        gender: f.gender,
        address: f.address,
        ppbRofrId: f.ppbRofrId,
        photo: f.photo,
        bankAccountNumber: f.bankAccountNumber,
        ifscCode: f.ifscCode,
        accountVerified: f.accountVerified,
        appliedExtent: f.appliedExtent,
        approvedExtent: f.approvedExtent,
        numberOfPlants: f.numberOfPlants,
        methodOfPlantation: f.methodOfPlantation,
        plantType: f.plantType,
        plantationDate: f.plantationDate,
        mlrdPlants: f.mlrdPlants,
        fullCostPlants: f.fullCostPlants,
        latitude: f.latitude,
        longitude: f.longitude,
        applicationId: f.applicationId,
        farmerId: f.farmerId,
        proposedYear: f.proposedYear,
        registrationDate: f.registrationDate,
        asoId: f.asoId,
        paymentUtrDd: f.paymentUtrDd,
        status: f.status,
        district: f.district,
        mandal: f.mandal,
        village: f.village,
        syncStatus: f.syncStatusLocal,
        createdBy: f.createdBy,
        updatedBy: f.updatedBy,
        createdAt: new Date(f.createdAt).toISOString(),
        updatedAt: new Date(f.updatedAt).toISOString(),
    };
};

// --- Geo Data Optimization & Utilities ---

// Create a more efficient map-based structure for fast geo lookups
interface VillageInfo { name: string; }
interface MandalInfo { name: string; villages: Record<string, VillageInfo>; }
interface DistrictInfo { name: string; mandals: Record<string, MandalInfo>; }

export const geoMap: Record<string, DistrictInfo> = GEO_DATA.reduce((distAcc, district) => {
    distAcc[district.code] = {
        name: district.name,
        mandals: district.mandals.reduce((mandAcc, mandal) => {
            mandAcc[mandal.code] = {
                name: mandal.name,
                villages: mandal.villages.reduce((villAcc, village) => {
                    villAcc[village.code] = { name: village.name };
                    return villAcc;
                }, {} as Record<string, VillageInfo>),
            };
            return mandAcc;
        }, {} as Record<string, MandalInfo>),
    };
    return distAcc;
}, {} as Record<string, DistrictInfo>);

// Helper function to get geo names from the optimized map
export const getGeoName = (type: 'district' | 'mandal' | 'village', codes: { district: string; mandal?: string; village?: string; }) => {
    try {
        if (!codes.district) return 'N/A';
        const district = geoMap[codes.district];
        if (!district) return codes.district;
        if (type === 'district') return district.name;

        if (!codes.mandal) return 'N/A';
        const mandal = district.mandals[codes.mandal];
        if (!mandal) return codes.mandal;
        if (type === 'mandal') return mandal.name;
        
        if (!codes.village) return 'N/A';
        const village = mandal.villages[codes.village];
        if (!village) return codes.village;
        if (type === 'village') return village.name;
    } catch (e) {
        console.error("Error getting geo name:", e);
        return 'N/A';
    }
    return codes[type] || 'N/A';
};

// --- HTML Sanitization ---
export const sanitizeHTML = (htmlString: string | undefined | null): string => {
    if (!htmlString) return '';
    const allowedTags = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'b', 'i', 'h3'];
    try {
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        const allElements = doc.body.getElementsByTagName('*');
        
        for (let i = allElements.length - 1; i >= 0; i--) {
            const element = allElements[i];
            const tagName = element.tagName.toLowerCase();

            if (!allowedTags.includes(tagName)) {
                // Replace disallowed tag with its content
                const parent = element.parentNode;
                if (parent) {
                    while (element.firstChild) {
                        parent.insertBefore(element.firstChild, element);
                    }
                    parent.removeChild(element);
                }
            } else {
                // Remove any attributes
                for (let j = element.attributes.length - 1; j >= 0; j--) {
                    element.removeAttribute(element.attributes[j].name);
                }
            }
        }
        return doc.body.innerHTML;
    } catch (e) {
        console.error("HTML sanitization failed", e);
        // Fallback to simple script tag removal on error
        return htmlString.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
};