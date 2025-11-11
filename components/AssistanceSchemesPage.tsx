import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, AssistanceApplicationModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { AssistanceScheme, AssistanceApplicationStatus, User, ActivityType } from '../types';
import { ASSISTANCE_SCHEMES } from '../data/assistanceSchemes';
import CustomSelect from './CustomSelect';

interface AssistanceSchemesPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const AssistanceStatusBadge: React.FC<{ status: AssistanceApplicationStatus }> = ({ status }) => {
    const colors: Record<AssistanceApplicationStatus, string> = {
        [AssistanceApplicationStatus.NotApplied]: 'bg-gray-100 text-gray-600',
        [AssistanceApplicationStatus.Applied]: 'bg-blue-100 text-blue-800',
        [AssistanceApplicationStatus.Approved]: 'bg-green-100 text-green-800',
        [AssistanceApplicationStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>{status}</span>;
};

const AssistanceSchemesPage: React.FC<AssistanceSchemesPageProps> = ({ onBack, currentUser, setNotification }) => {
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Government Assistance Schemes</h1>
                        <p className="text-gray-500">Overview of available schemes for oil palm cultivation.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="space-y-4">
                    {ASSISTANCE_SCHEMES.map(scheme => (
                        <div key={scheme.id} className="bg-white p-6 rounded-lg shadow-md border">
                            <h2 className="text-xl font-bold text-gray-800">{scheme.title}</h2>
                            <p className="text-sm font-semibold text-gray-500 mb-2">{scheme.category}</p>
                            <p className="text-gray-600 mb-3">{scheme.description}</p>
                            <div className="bg-green-50 p-3 rounded-md border border-green-200">
                                <p className="font-semibold text-green-800">{scheme.assistance}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AssistanceSchemesPage;
