import React, { useState, useEffect, useMemo } from 'react';
import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { FarmerModel, PlotModel } from '../db';
import { User, Farmer, Plot } from '../types';
import PrintView from './PrintView';
import { farmerModelToPlain, plotModelToPlain } from '../lib/utils';
import { useDatabase } from '../DatabaseContext';

interface PrintQueuePageProps {
    queuedFarmerIds: string[];
    users: User[];
    onRemove: (farmerId: string) => void;
    onClear: () => void;
    onBack: () => void;
}

interface FarmerWithPlots {
    farmer: Farmer;
    plots: Plot[];
}


const PrintQueuePage: React.FC<PrintQueuePageProps> = ({ queuedFarmerIds, users, onRemove, onClear, onBack }) => {
    const [farmersWithPlots, setFarmersWithPlots] = useState<FarmerWithPlots[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const database = useDatabase();

    useEffect(() => {
        const fetchFarmersAndPlots = async () => {
            if (queuedFarmerIds.length === 0) {
                setFarmersWithPlots([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const farmersCollection = database.get<FarmerModel>('farmers');
                const farmers = await farmersCollection.query(Q.where('id', Q.oneOf(queuedFarmerIds))).fetch();
                // Ensure the order is the same as the queue order
                const sortedFarmers = queuedFarmerIds.map(id => farmers.find(f => f.id === id)).filter(Boolean) as FarmerModel[];
                
                const plotsPromises = sortedFarmers.map(f => f.plots.fetch());
                const plotsByFarmerArray = await Promise.all(plotsPromises);

                const combinedData = sortedFarmers.map((f, index) => ({
                    farmer: farmerModelToPlain(f)!,
                    plots: plotsByFarmerArray[index].map(p => plotModelToPlain(p)!)
                }));

                setFarmersWithPlots(combinedData);

            } catch (error) {
                console.error("Failed to fetch farmers for print queue:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFarmersAndPlots();
    }, [queuedFarmerIds, database]);
    

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-gray-50 min-h-full">
            <style>
                {`
                @media print {
                    body {
                        background-color: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-container {
                        margin: 0;
                        padding: 0;
                        box-shadow: none;
                        border: none;
                    }
                    .print-item {
                        page-break-after: always;
                    }
                    .print-item:last-child {
                        page-break-after: auto;
                    }
                }
                `}
            </style>
            
            <div className="max-w-7xl mx-auto p-6">
                {/* Header and Controls (No Print) */}
                <div className="no-print flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Print Queue</h1>
                        <p className="text-gray-500">{queuedFarmerIds.length} farmer(s) ready to print.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                         <button onClick={onClear} disabled={queuedFarmerIds.length === 0} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold text-sm disabled:bg-gray-300">
                            Clear Queue
                        </button>
                        <button onClick={handlePrint} disabled={queuedFarmerIds.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm disabled:bg-gray-300">
                            Print All
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                {isLoading ? (
                    <div className="text-center py-20 text-gray-500">Loading queue...</div>
                ) : farmersWithPlots.length > 0 ? (
                    <div className="space-y-6">
                        {farmersWithPlots.map(({ farmer, plots }) => (
                            <div key={farmer.id} className="print-container bg-white rounded-lg shadow-md relative">
                                <button
                                    onClick={() => onRemove(farmer.id)}
                                    className="no-print absolute top-2 right-2 p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                                    title="Remove from queue"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <div className="print-item">
                                    <PrintView farmer={farmer} plots={plots} users={users} isForPdf={true} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-print text-center py-20 text-gray-500 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold">The Print Queue is Empty</h2>
                        <p className="mt-2">Select farmers from the directory and click "Add to Print Queue" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrintQueuePage;
