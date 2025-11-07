import { Farmer, Plot } from './types';
import { FarmerModel, DistrictModel, MandalModel, VillageModel, PlotModel } from '../db';
import { Database } from '@nozbe/watermelondb';

// --- Farmer Data Conversion ---
export const farmerModelToPlain = (f: FarmerModel | null): Farmer | null => {
    if (!f) return null;
    return {
        id: (f as any).id,
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
        // FIX: Correctly map the model's `syncStatusLocal` to the plain object's `syncStatus`.
        syncStatus: f.syncStatusLocal,
        createdBy: f.createdBy,
        updatedBy: f.updatedBy,
        createdAt: new Date(f.createdAt).toISOString(),
        updatedAt: new Date(f.updatedAt).toISOString(),
        customFields: f.customFields,
    };
};

// FIX: Add a utility function to convert a PlotModel to a plain Plot object.
export const plotModelToPlain = (p: PlotModel | null): Plot | null => {
    if (!p) return null;
    return {
        id: p.id,
        farmerId: p.farmerId,
        acreage: p.acreage,
        soilType: p.soilType,
        plantationDate: p.plantationDate,
        geojson: p.geojson,
        numberOfPlants: p.numberOfPlants,
        methodOfPlantation: p.methodOfPlantation,
        plantType: p.plantType,
        mlrdPlants: p.mlrdPlants,
        fullCostPlants: p.fullCostPlants,
        syncStatus: p.syncStatusLocal,
        tenantId: p.tenantId,
        createdAt: new Date(p.createdAt).toISOString(),
        updatedAt: new Date(p.updatedAt).toISOString(),
    };
};


// --- Geo Data Optimization & Utilities ---

let geoNameMapStore: Record<string, { name: string, mandals: Record<string, { name: string, villages: Record<string, { name: string }> }> }> | null = null;

// This function should be called once when the app initializes to build the map from DB data.
export const buildGeoNameMap = async (database: Database) => {
    const districts = await database.get<DistrictModel>('districts').query().fetch();
    const mandals = await database.get<MandalModel>('mandals').query().fetch();
    const villages = await database.get<VillageModel>('villages').query().fetch();

    const map = districts.reduce((acc, district) => {
        acc[district.code] = {
            name: district.name,
            mandals: mandals.filter(m => m.districtId === district.id).reduce((mAcc, mandal) => {
                mAcc[mandal.code] = {
                    name: mandal.name,
                    villages: villages.filter(v => v.mandalId === mandal.id).reduce((vAcc, village) => {
                        vAcc[village.code] = { name: village.name };
                        return vAcc;
                    }, {} as Record<string, { name: string }>)
                };
                return mAcc;
            }, {} as Record<string, { name: string, villages: Record<string, { name: string }> }>)
        };
        return acc;
    }, {} as Record<string, { name: string, mandals: Record<string, { name: string, villages: Record<string, { name: string }> }> }>);
    
    geoNameMapStore = map;
};

// getGeoName now uses the in-memory map built from the database.
export const getGeoName = (type: 'district' | 'mandal' | 'village', codes: { district: string; mandal?: string; village?: string; }) => {
    if (!geoNameMapStore) {
        console.warn("Geo name map is not ready. Returning code instead of name.");
        return codes[type] || '...';
    }
    
    try {
        if (!codes.district) return codes.district || 'N/A';
        const district = geoNameMapStore[codes.district];
        if (!district) return codes.district;
        if (type === 'district') return district.name;

        if (!codes.mandal) return codes.mandal || 'N/A';
        const mandal = district.mandals[codes.mandal];
        if (!mandal) return codes.mandal;
        if (type === 'mandal') return mandal.name;
        
        if (!codes.village) return codes.village || 'N/A';
        const village = mandal.villages[codes.village];
        if (!village) return codes.village;
        if (type === 'village') return village.name;
    } catch (e) {
        console.error("Error getting geo name for codes:", codes, e);
        // Fallback to returning the code if name lookup fails
        return codes[type] || 'Error';
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