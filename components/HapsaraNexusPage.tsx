import React, { useState, lazy, Suspense } from 'react';
import { User } from '../types';

const FieldServicePage = lazy(() => import('./FieldServicePage'));
const AppointmentScheduler = lazy(() => import('./AppointmentScheduler'));

interface HapsaraNexusPageProps {
    onBack: () => void;
    currentUser: User;
}

const HapsaraNexusPage: React.FC<HapsaraNexusPageProps> = ({ onBack, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'collection' | 'visits'>('collection');

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara Nexus</h1>
                        <p className="text-gray-500">Farmer-centric logistics and service coordination.</p>
                    </div>
                     <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Back to Dashboard
                    </button>
                </div>
                
                 <div className="bg-white rounded-lg shadow-xl p-2">
                    <div className="flex border-b">
                        <button onClick={() => setActiveTab('collection')} className={`px-4 py-3 font-semibold ${activeTab === 'collection' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Collection Center Booking</button>
                        <button onClick={() => setActiveTab('visits')} className={`px-4 py-3 font-semibold ${activeTab === 'visits' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Field Officer Visits</button>
                    </div>

                    <div className="p-6">
                        <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                            {activeTab === 'collection' && <AppointmentScheduler currentUser={currentUser} />}
                            {activeTab === 'visits' && <FieldServicePage currentUser={currentUser} onBack={() => {}} />}
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HapsaraNexusPage;