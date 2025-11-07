import React, { useState, useRef, useEffect } from 'react';
import { Farmer } from '../types';
import StatusBadge from './StatusBadge';
import { getGeoName } from '../lib/utils';

interface FarmerCardProps {
    farmer: Farmer;
    isSelected: boolean;
    onSelectionChange: (farmerId: string, isSelected: boolean) => void;
    onPrint: (farmerId: string) => void;
    onExportToPdf: (farmerId: string) => void;
    onNavigate: (path: string) => void;
    isNewlyAdded: boolean;
}

const FarmerCard: React.FC<FarmerCardProps> = ({ farmer, isSelected, onSelectionChange, onPrint, onExportToPdf, onNavigate, isNewlyAdded }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigateClick = () => {
        onNavigate(`farmer-details/${farmer.id}`);
    };

    const cardBgClass = isNewlyAdded ? 'bg-green-100' : isSelected ? 'bg-green-50' : 'bg-white';

    return (
        <div className={`rounded-lg shadow-md overflow-hidden border hover:shadow-xl transition-all duration-1000 ${isSelected ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200'} ${cardBgClass}`}>
            <div className="p-4 relative">
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <input
                        type="checkbox"
                        className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onSelectionChange(farmer.id, e.target.checked);
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                    <div ref={menuRef} className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1 rounded-full text-gray-500 hover:bg-gray-200">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border">
                                <ul className="py-1">
                                    <li><button onClick={(e) => { e.stopPropagation(); onPrint(farmer.id); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Print</button></li>
                                    <li><button onClick={(e) => { e.stopPropagation(); onExportToPdf(farmer.id); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Download PDF</button></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div onClick={handleNavigateClick} className="cursor-pointer">
                    <div className="flex items-center gap-4 mb-4">
                        {farmer.photo ? (
                            <img src={farmer.photo} alt={farmer.fullName} className="h-16 w-16 rounded-full object-cover border-2 border-gray-200" />
                        ) : (
                            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">
                                {farmer.fullName.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{farmer.fullName}</h3>
                            <p className="text-sm font-mono text-gray-500">{farmer.farmerId}</p>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Status</span>
                            <StatusBadge status={farmer.status} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Location</span>
                            <span className="font-medium text-gray-700 text-right">{getGeoName('village', farmer)}, {getGeoName('mandal', farmer)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Area</span>
                            <span className="font-medium text-gray-700">{farmer.approvedExtent || 0} Acres</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Reg. Date</span>
                            <span className="font-medium text-gray-700">{new Date(farmer.registrationDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FarmerCard;
