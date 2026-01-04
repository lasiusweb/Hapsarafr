// lib/geo.ts
import { GEO_DATA } from '../data/geoData';

export const getGeoName = (type: 'district' | 'mandal' | 'village', farmer: { district: string, mandal?: string, village?: string }): string => {
    const district = GEO_DATA.find(d => d.code === farmer.district);
    if (!district) return 'Unknown';
    if (type === 'district') return district.name;

    const mandal = district.mandals.find(m => m.code === farmer.mandal);
    if (!mandal) return 'Unknown';
    if (type === 'mandal') return mandal.name;

    const village = mandal.villages.find(v => v.code === farmer.village);
    return village ? village.name : 'Unknown';
};
