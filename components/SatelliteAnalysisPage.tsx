import React from 'react';
import ComingSoon from './ComingSoon';

interface SatelliteAnalysisPageProps {
    onBack: () => void;
}

const SatelliteAnalysisPage: React.FC<SatelliteAnalysisPageProps> = ({ onBack }) => {
    return (
        <ComingSoon
            title="Satellite & Drone Imagery Analysis"
            description="Integrate with satellite and drone imagery providers to analyze farm plots remotely. This powerful tool will use AI to automatically verify plantation extent, estimate plant counts, and detect widespread issues like crop stress or irrigation problems across entire regions, enabling proactive and large-scale monitoring."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            onBack={onBack}
        />
    );
};

export default SatelliteAnalysisPage;
