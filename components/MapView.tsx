import React, { useEffect, useRef, useState } from 'react';
import { Farmer, FarmerStatus } from '../types';
import { FarmerModel, PlotModel } from '../db';

// Declare Leaflet in the global scope since it's loaded from a CDN
declare var L: any;

interface MapViewProps {
    farmers: FarmerModel[];
    onNavigate: (path: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ farmers, onNavigate }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [plotsWithGeo, setPlotsWithGeo] = useState<{ plot: PlotModel; farmer: FarmerModel; }[]>([]);

    useEffect(() => {
        const processFarmerData = async () => {
            setIsLoading(true);
            const allPlots = (await Promise.all(farmers.map(async f => {
                const plots = await f.plots.fetch();
                return plots.map(p => ({ plot: p, farmer: f }));
            }))).flat();

            setPlotsWithGeo(allPlots.filter(p => p.plot.geojson));
            setIsLoading(false);
        };
        processFarmerData();
    }, [farmers]);


    useEffect(() => {
        if (isLoading) return; // Wait for data processing

        // Initialize map only once
        if (mapContainerRef.current && !mapInstanceRef.current) {
            // Default center, e.g., somewhere in Telangana, India
            const mapCenter: [number, number] = [17.9689, 79.5941];
            
            const map = L.map(mapContainerRef.current).setView(mapCenter, 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;
        if (map) {
            // Clear existing layers before adding new ones
            map.eachLayer((layer: any) => {
                if (!!layer.toGeoJSON) { // Check if it's a GeoJSON layer or marker
                    map.removeLayer(layer);
                }
            });

            const statusColors: Record<FarmerStatus, string> = {
                [FarmerStatus.Registered]: '#3b82f6', // blue-500
                [FarmerStatus.Sanctioned]: '#f97316', // orange-500
                [FarmerStatus.Planted]: '#22c55e', // green-500
                [FarmerStatus.PaymentDone]: '#a855f7', // purple-500
            };

            const layers = plotsWithGeo.map(({ plot, farmer }) => {
                try {
                    const geoJsonData = JSON.parse(plot.geojson!);
                    const layer = L.geoJSON(geoJsonData, {
                        style: {
                            color: statusColors[farmer.status],
                            weight: 2,
                            opacity: 0.8,
                            fillOpacity: 0.3
                        }
                    });

                    const popupContent = `
                        <div style="font-family: sans-serif; font-size: 14px; min-width: 200px;">
                            <h3 style="margin: 0 0 5px; font-weight: bold; font-size: 16px;">${farmer.fullName}</h3>
                            <p style="margin: 0 0 3px;"><strong>Plot Acreage:</strong> ${plot.acreage} ac</p>
                            <p style="margin: 0 0 8px; display: flex; align-items: center; gap: 6px;">
                                <strong>Status:</strong> 
                                <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; background-color: ${statusColors[farmer.status]}; color: white; font-size: 12px; font-weight: 500; line-height: 1;">
                                    ${farmer.status}
                                </span>
                            </p>
                            <a href="#/farmer-details/${farmer.id}" class="view-details-link" style="color: #16a34a; font-weight: bold; text-decoration: none;">View Farmer Details &rarr;</a>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                    return layer;
                } catch (e) {
                    console.error("Invalid GeoJSON for plot:", plot.id, e);
                    return null;
                }
            }).filter(Boolean);

            if (layers.length > 0) {
                const featureGroup = L.featureGroup(layers).addTo(map);
                map.fitBounds(featureGroup.getBounds().pad(0.1));
            }

            // Add event listener for custom links in popups
             map.on('popupopen', (e: any) => {
                const link = e.popup.getElement().querySelector('.view-details-link');
                if (link) {
                    link.addEventListener('click', (event: any) => {
                        event.preventDefault();
                        const pathWithHash = new URL(event.target.href).hash;
                        const path = pathWithHash.substring(1);
                        onNavigate(path);
                    });
                }
            });
        }
        
        // Cleanup function
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isLoading, plotsWithGeo, onNavigate]);

    return (
        <div className="bg-white rounded-lg shadow-xl p-4 h-full flex flex-col">
            {isLoading ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
                    <p>Loading map data...</p>
                 </div>
            ) : plotsWithGeo.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01" /></svg>
                    <h2 className="text-xl font-semibold">No Farmers with Map Data</h2>
                    <p className="mt-2 max-w-md">To see farm boundaries on the map, ensure their plot details include valid GeoJSON data.</p>
                </div>
            ) : (
                <div ref={mapContainerRef} className="flex-1 rounded-md" style={{ minHeight: '500px' }} />
            )}
        </div>
    );
};

export default MapView;