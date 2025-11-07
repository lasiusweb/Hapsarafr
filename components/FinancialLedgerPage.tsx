import React from 'react';
import ComingSoon from './ComingSoon';

interface FinancialLedgerPageProps {
    onBack: () => void;
}

const FinancialLedgerPage: React.FC<FinancialLedgerPageProps> = ({ onBack }) => {
    return (
        <ComingSoon
            title="Financial & Resource Management"
            description="Expand beyond subsidies into a complete financial ledger for each farmer. This feature will allow for tracking the costs of inputs (like fertilizers and pesticides) against harvest revenue. The result will be a powerful profitability analysis tool, providing invaluable economic insights per farmer and per region."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
            onBack={onBack}
        />
    );
};

export default FinancialLedgerPage;
