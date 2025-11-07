import React from 'react';
import ComingSoon from './ComingSoon';

interface YieldPredictionPageProps {
    onBack: () => void;
}

const YieldPredictionPage: React.FC<YieldPredictionPageProps> = ({ onBack }) => {
    return (
        <ComingSoon
            title="AI-Powered Yield Prediction"
            description="This feature will leverage AI and historical data—including plantation dates, plant types, weather patterns, and harvest records—to build predictive models. These forecasts will help optimize logistics, plan for processing mill capacity, and provide valuable insights for supply chain management."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            onBack={onBack}
        />
    );
};

export default YieldPredictionPage;
