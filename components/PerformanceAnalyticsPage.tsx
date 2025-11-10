import React from 'react';
import ComingSoon from './ComingSoon';

interface PerformanceAnalyticsPageProps {
    onBack: () => void;
}

const PerformanceAnalyticsPage: React.FC<PerformanceAnalyticsPageProps> = ({ onBack }) => {
    return (
        <ComingSoon
            title="Performance Analytics"
            description="Track key performance indicators (KPIs) for your field officers and teams. Analyze metrics like new farmer registrations, tasks completed, plots verified, and resources distributed over time to identify top performers and areas for improvement."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            onBack={onBack}
        />
    );
};

export default PerformanceAnalyticsPage;