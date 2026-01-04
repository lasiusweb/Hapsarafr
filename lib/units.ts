// lib/units.ts
export const normalizeToKg = (quantity: number, unit: string): number => {
    const q = parseFloat(String(quantity));
    if (isNaN(q)) return 0;

    switch (unit.toLowerCase()) {
        case 'tons':
        case 'ton':
            return q * 1000;
        case 'quintal':
        case 'quintals':
            return q * 100;
        case 'kg':
        case 'kgs':
            return q;
        case 'bunch': // Avg weight of FFB bunch approx 20kg
            return q * 20;
        case 'bag': // Standard gunny bag approx 50kg
            return q * 50;
        case 'tractor': // Small tractor approx 3 tons
            return q * 3000;
        default:
            return q;
    }
};

export const getUnitLabel = (unit: string): string => {
    switch (unit.toLowerCase()) {
        case 'tons': return 'Tons (1000kg)';
        case 'quintal': return 'Quintals (100kg)';
        case 'kg': return 'Kilograms';
        case 'bunch': return 'Bunches (~20kg)';
        case 'bag': return 'Bags (~50kg)';
        default: return unit;
    }
};
