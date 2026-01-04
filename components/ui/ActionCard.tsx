// components/ui/ActionCard.tsx
import React from 'react';

interface ActionCardProps {
    title: string;
    count: number;
    onClick: () => void;
    icon: React.ReactNode;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, count, onClick, icon }) => (
    <button onClick={onClick} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:border-green-300 border border-transparent transition-all text-left w-full flex items-start gap-4">
        <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{count}</p>
            <p className="font-semibold text-gray-600">{title}</p>
        </div>
    </button>
);

export default ActionCard;
