import React from 'react';
import ComingSoon from './ComingSoon';
import { User } from '../types';

const EquipmentManagementPage: React.FC<{ onBack: () => void; currentUser: User; }> = ({ onBack }) => {
    return (
        <ComingSoon
            title="Equipment & Asset Management"
            description="Manage processing equipment, track maintenance schedules, and log operational parameters. This feature is designed for processing facility managers to ensure optimal performance and uptime."
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>}
            onBack={onBack}
        />
    );
};

export default EquipmentManagementPage;
