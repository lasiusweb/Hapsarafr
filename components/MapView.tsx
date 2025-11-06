import React, { useEffect, useRef } from 'react';
import { Farmer, FarmerStatus } from '../types';

// Declare Leaflet in the global scope since it's loaded from a CDN
declare var L: any;

interface MapViewProps {
    farmers: Farmer[];
    onNavigate: (path: string) => void;
}

const MapView: React.FC<MapViewProps> = ({ farmers, onNavigate }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    const farmersWithLocation = farmers.filter(f => f.latitude != null && f.longitude != null);

    useEffect(() => {
        // Initialize map only once
        if (mapContainerRef.current && !mapInstanceRef.current) {
            // Default center, e.g., somewhere in Telangana, India
            let mapCenter: [number, number] = [17.9689, 79.5941];
            
            // If there are farmers with locations, center the map on the first one
            if (farmersWithLocation.length > 0) {
                 mapCenter = [farmersWithLocation[0].latitude!, farmersWithLocation[0].longitude!];
            }

            const map = L.map(mapContainerRef.current).setView(mapCenter, 10);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            mapInstanceRef.current = map;

            // Add markers
            const markers = farmersWithLocation.map(farmer => {
                const statusColors: Record<FarmerStatus, string> = {
                    [FarmerStatus.Registered]: '#3b82f6', // blue-500
                    [FarmerStatus.Sanctioned]: '#f97316', // orange-500
                    [FarmerStatus.Planted]: '#22c55e', // green-500
                    [FarmerStatus.PaymentDone]: '#a855f7', // purple-500
                };
                
                const popupContent = `
                    <div style="font-family: sans-serif; font-size: 14px; min-width: 200px;">
                        <h3 style="margin: 0 0 5px; font-weight: bold; font-size: 16px;">${farmer.fullName}</h3>
                        <p style="margin: 0 0 3px;"><strong>Hap ID:</strong> ${farmer.farmerId}</p>
                        <p style="margin: 0 0 8px; display: flex; align-items: center; gap: 6px;">
                            <strong>Status:</strong> 
                            <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; background-color: ${statusColors[farmer.status]}; color: white; font-size: 12px; font-weight: 500; line-height: 1;">
                                ${farmer.status}
                            </span>
                        </p>
                        <a href="#/farmer-details/${farmer.id}" class="view-details-link" style="color: #16a34a; font-weight: bold; text-decoration: none;">View Details &rarr;</a>
                    </div>
                `;

                return L.marker([farmer.latitude!, farmer.longitude!])
                    .addTo(map)
                    .bindPopup(popupContent);
            });
            
            // Add event listener for custom links in popups to work with the app's hash-based routing
            map.on('popupopen', (e: any) => {
                const link = e.popup.getElement().querySelector('.view-details-link');
                if (link) {
                    link.addEventListener('click', (event: any) => {
                        event.preventDefault();
                        const pathWithHash = new URL(event.target.href).hash; // e.g., #/farmer-details/some-id
                        const path = pathWithHash.substring(1); // remove the '#'
                        onNavigate(path);
                    });
                }
            });

            // Adjust map bounds to fit all markers
            if (markers.length > 0) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
        
        // Cleanup function to remove the map instance when the component unmounts
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [farmersWithLocation, onNavigate]); // Re-run effect only if these change

    return (
        <div className="bg-white rounded-lg shadow-xl p-4 h-full flex flex-col">
            {farmersWithLocation.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01" /></svg>
                    <h2 className="text-xl font-semibold">No Farmers with Location Data</h2>
                    <p className="mt-2 max-w-md">To see farmers on the map, ensure their Latitude and Longitude are captured during registration or by editing their details.</p>
                </div>
            ) : (
                <div ref={mapContainerRef} className="flex-1 rounded-md" style={{ minHeight: '500px' }} />
            )}
        </div>
    );
};

export default MapView;
