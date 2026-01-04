import React, { useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmPlotModel } from '../db';
import { Q } from '@nozbe/watermelondb';

interface SatelliteAnalysisPageProps {
    onBack: () => void;
}

const SatelliteAnalysisPage: React.FC<SatelliteAnalysisPageProps> = ({ onBack }) => {
    const database = useDatabase();

    // Fetch plots that have GeoJSON data
    const plotsWithGeo = useQuery<FarmPlotModel>(
        database.get<FarmPlotModel>('farm_plots').query(Q.where('geojson', Q.notEq(null)))
    );

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Satellite & Drone Analysis</h1>
                        <p className="text-gray-500">Remote monitoring of farm plots.</p>
                    </div>
                    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
                        Back
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        <h3 className="font-bold text-gray-700 mb-4">Available Plots ({plotsWithGeo.length})</h3>
                        {plotsWithGeo.length > 0 ? (
                            <ul className="space-y-2">
                                {plotsWithGeo.map(plot => (
                                    <li key={plot.id} className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                                        <p className="font-semibold">{plot.name}</p>
                                        <p className="text-xs text-gray-500">Acres: {plot.acreage} | Plants: {plot.numberOfPlants}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic">No plots with GeoJSON data found.</p>
                        )}
                    </div>

                    <div className="lg:col-span-2 bg-gray-900 rounded-lg shadow-md flex items-center justify-center min-h-[500px]">
                        <div className="text-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" />
                            </svg>
                            <p className="text-xl">Map Visualization Placeholder</p>
                            <p className="text-sm mt-2">Select a plot to view imagery (Integration pending)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatelliteAnalysisPage;
