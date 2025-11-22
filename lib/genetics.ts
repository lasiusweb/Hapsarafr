

/**
 * Mock genetic algorithms for Hapsara Genetica.
 */

// Simple hash function to simulate a unique Passport ID from seed characteristics.
// In production, this would use a standard hashing algorithm (SHA-256) on canonicalized data.
export const generateSeedPassportHash = (
    name: string, 
    origin: string, 
    farmerId: string,
    traits: Record<string, string>
): string => {
    const dataString = `${name}-${origin}-${farmerId}-${JSON.stringify(traits)}`;
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'HGP-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
};

// Simulates calculating genetic distance (similarity) between two seeds.
// 0 = Identical, 1 = Completely different.
// In reality, this would compare DNA markers.
export const calculateGeneticDistance = (seedA_Id: string, seedB_Id: string): number => {
    // Mock logic: use IDs to generate a pseudo-random distance
    const combined = seedA_Id + seedB_Id;
    let val = 0;
    for (let i = 0; i < combined.length; i++) {
        val += combined.charCodeAt(i);
    }
    return (val % 100) / 100; 
};

// Generate a human-readable "DNA Fingerprint" visualization string
export const generateVisualFingerprint = (hash: string): string[] => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'];
    const fingerprint = [];
    for(let i=0; i<8; i++) {
        // Pick a color based on char code
        const charCode = hash.charCodeAt(i % hash.length) || 0;
        fingerprint.push(colors[charCode % colors.length]);
    }
    return fingerprint;
};
