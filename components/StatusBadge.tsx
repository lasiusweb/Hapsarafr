import React from 'react';
import { FarmerStatus } from '../types';

interface StatusBadgeProps {
    status: FarmerStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const colors: Record<FarmerStatus, string> = {
        [FarmerStatus.Registered]: 'bg-blue-100 text-blue-800',
        [FarmerStatus.Sanctioned]: 'bg-yellow-100 text-yellow-800',
        [FarmerStatus.Planted]: 'bg-green-100 text-green-800',
        [FarmerStatus.PaymentDone]: 'bg-purple-100 text-purple-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

export default StatusBadge;
