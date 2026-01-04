import React, { useState } from 'react';
import { useDatabase } from '../DatabaseContext';
import { exportToExcel } from '../lib/export';
import { useNavigate } from 'react-router-dom';

const DataMenu: React.FC = () => {
    const database = useDatabase();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleExportAll = async () => {
        const farmers = await database.get('farmers').query().fetch();
        // @ts-ignore
        const plainFarmers = farmers.map(f => f._raw);
        exportToExcel(plainFarmers, 'Full_Database_Export');
    };

    return (
        <div className="relative inline-block text-left">
            <div>
                <button 
                    type="button" 
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    id="menu-button" 
                    aria-expanded="true" 
                    aria-haspopup="true"
                >
                    Data Options
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div 
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50" 
                    role="menu" 
                    aria-orientation="vertical" 
                    aria-labelledby="menu-button" 
                    tabIndex={-1}
                    onMouseLeave={() => setIsOpen(false)}
                >
                    <div className="py-1" role="none">
                        <button 
                            onClick={handleExportAll}
                            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" 
                            role="menuitem"
                        >
                            Export All Data (Excel)
                        </button>
                        <button 
                            onClick={() => navigate('/schema-manager')}
                            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" 
                            role="menuitem"
                        >
                            Schema Manager
                        </button>
                        <button 
                            onClick={() => navigate('/geo-management')}
                            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100" 
                            role="menuitem"
                        >
                            Geo Management
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataMenu;
