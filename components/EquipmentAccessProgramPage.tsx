import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { EquipmentModel, EquipmentLeaseModel } from '../db';

interface EquipmentAccessProgramPageProps {
    onBack: () => void;
    currentUser: User;
}

const EquipmentCard: React.FC<{ equipment: EquipmentModel, onRequest: () => void }> = ({ equipment, onRequest }) => (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between">
        <div>
            <h3 className="font-bold text-lg text-gray-800">{equipment.name}</h3>
            <p className="text-sm text-gray-500">{equipment.type}</p>
        </div>
        <div className="mt-4">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${equipment.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {equipment.status}
            </span>
             <button
                onClick={onRequest}
                disabled={equipment.status !== 'operational'}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm disabled:bg-gray-400"
            >
                Request
            </button>
        </div>
    </div>
);

const EquipmentAccessProgramPage: React.FC<EquipmentAccessProgramPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    
    const availableEquipment = useQuery(useMemo(() => database.get<EquipmentModel>('equipment').query(), [database]));
    // In a real app, you'd filter leases for the current farmer
    const myLeases = useQuery(useMemo(() => database.get<EquipmentLeaseModel>('equipment_leases').query(), [database]));
    
    const equipmentMap = useMemo(() => new Map(availableEquipment.map(e => [e.id, e])), [availableEquipment]);

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Equipment Access Program</h1>
                        <p className="text-gray-500">Rent or lease essential equipment for your farm.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back
                    </button>
                </div>

                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">My Rentals</h2>
                        <div className="bg-white rounded-lg shadow-md p-4">
                            {myLeases.length > 0 ? (
                                <ul className="divide-y">
                                    {myLeases.map(lease => {
                                        const equipment = equipmentMap.get(lease.equipmentId);
                                        return (
                                            <li key={lease.id} className="py-3 flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{equipment?.name || 'Unknown Equipment'}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lease.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {lease.paymentStatus}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-8">You have no active or past equipment rentals.</p>
                            )}
                        </div>
                    </div>

                    <div>
                         <h2 className="text-2xl font-bold text-gray-700 mb-4">Available for Rent</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {availableEquipment.map(equipment => (
                                <EquipmentCard key={equipment.id} equipment={equipment} onRequest={() => alert(`Requesting ${equipment.name}...`)} />
                            ))}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentAccessProgramPage;
