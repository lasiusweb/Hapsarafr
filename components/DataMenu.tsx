
import React, { useState, useEffect, useRef } from 'react';
import { Permission } from '../types';

interface DataMenuProps {
    onImport: () => void;
    onExportExcel: () => void;
    onExportCsv: () => void;
    onViewRawData: () => void;
    permissions: Set<Permission>;
    isMobile?: boolean;
    onAction?: (action: () => void) => void;
    variant?: 'button' | 'nav';
}

const DataMenu: React.FC<DataMenuProps> = ({ 
    onImport, onExportExcel, onExportCsv, onViewRawData, permissions, 
    isMobile = false, onAction = (action) => action(), variant = 'button' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const canImport = permissions.has(Permission.CAN_IMPORT_DATA);
    const canExport = permissions.has(Permission.CAN_EXPORT_DATA);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAction = (action: () => void) => {
        onAction(action);
        setIsOpen(false);
    };
    
    // In mobile view, this component will render its items directly.
    if (isMobile) {
        return (
            <>
                {canImport && (
                    <button onClick={() => handleAction(onImport)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Import from Excel</button>
                )}
                 {canExport && (
                    <>
                        <button onClick={() => handleAction(onViewRawData)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">View Raw Data</button>
                        <button onClick={() => handleAction(onExportExcel)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Export to Excel</button>
                        <button onClick={() => handleAction(onExportCsv)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Export to CSV</button>
                    </>
                )}
            </>
        )
    }


    if (!canImport && !canExport) {
        return null;
    }
    
    const triggerClasses = variant === 'nav'
        ? "inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        : "px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition font-semibold flex items-center gap-2";


    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={triggerClasses}
            >
                Data
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {canImport && (
                            <button
                                onClick={() => handleAction(onImport)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                                role="menuitem"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span>Import from Excel</span>
                            </button>
                        )}
                        {canExport && (
                            <>
                                <button
                                    onClick={() => handleAction(onViewRawData)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                                    role="menuitem"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span>View Raw Data</span>
                                </button>
                                <div className="border-t my-1"></div>
                                <button
                                    onClick={() => handleAction(onExportExcel)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                                    role="menuitem"
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Export to Excel (.xlsx)</span>
                                </button>
                                <button
                                    onClick={() => handleAction(onExportCsv)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                                    role="menuitem"
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    <span>Export to CSV (.csv)</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataMenu;