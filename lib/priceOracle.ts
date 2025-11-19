
// Mock data for price oracle
const MOCK_MARKET_DATA: Record<string, Record<string, number>> = {
    'Warangal': {
        'Oil Palm': 14500,
        'Paddy': 2200,
        'Maize': 1950,
        'Cotton': 6800,
        'Chilli': 18000,
        'Turmeric': 7500,
        'Red Gram': 6000,
        'Green Gram': 7200,
        'Black Gram': 6500
    },
    'Mulugu': {
        'Oil Palm': 14200,
        'Paddy': 2150,
        'Maize': 1900,
        'Cotton': 6750,
        'Chilli': 17500,
        'Turmeric': 7400,
        'Red Gram': 5900,
        'Green Gram': 7100,
        'Black Gram': 6400
    }
};

export const getFairPriceRange = (crop: string, region: string, quality: string = 'Grade A') => {
    // Default to Warangal if region not found
    const regionData = MOCK_MARKET_DATA[region] || MOCK_MARKET_DATA['Warangal'];
    const basePrice = regionData[crop] || 2000; // Fallback base price

    let multiplier = 1.0;
    switch (quality) {
        case 'Grade A+': multiplier = 1.10; break;
        case 'Grade A': multiplier = 1.05; break;
        case 'Grade B': multiplier = 0.95; break;
        case 'Grade C': multiplier = 0.85; break;
        default: multiplier = 1.0;
    }

    const fairPrice = Math.round(basePrice * multiplier);
    // 5% spread
    const low = Math.round(fairPrice * 0.95);
    const high = Math.round(fairPrice * 1.05);

    return {
        low,
        high,
        fair: fairPrice,
        confidence: 0.85 // Mock confidence score
    };
};

export const getPriceTrend = (crop: string) => {
    // Random trend for demo
    return Math.random() > 0.5 ? 'up' : 'down';
};
