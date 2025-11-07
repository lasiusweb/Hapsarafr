import React, { useState } from 'react';
import { User, Permission } from '../types';

type View = 'dashboard' | 'farmer-directory' | 'profile' | 'admin' | 'billing' | 'usage-analytics' | 'content-manager' | 'subscription-management' | 'print-queue' | 'subsidy-management' | 'map-view' | 'help' | 'id-verification' | 'reports' | 'crop-health-scanner' | 'data-health' | 'geo-management';

interface SidebarProps {
    isOpen: boolean;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    currentUser: User | null;
    onLogout: () => void;
    onNavigate: (path: string) => void;
    currentView: View;
    permissions: Set<Permission>;
    onImport: () => void;
    onExportExcel: () => void;
    onExportCsv: () => void;
    onViewRawData: () => void;
    onShowPrivacy: () => void;
    onShowChangelog: () => void;
    printQueueCount: number;
    onShowSupabaseSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, isCollapsed, onToggleCollapse, currentUser, onLogout, onNavigate, currentView, permissions, 
    onImport, onExportExcel, onExportCsv, onViewRawData,
    onShowPrivacy, onShowChangelog, printQueueCount, onShowSupabaseSettings
}) => {
    
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const canManageAdmin = permissions.has(Permission.CAN_MANAGE_GROUPS) || permissions.has(Permission.CAN_MANAGE_USERS);
    const canManageContent = permissions.has(Permission.CAN_MANAGE_CONTENT);
    const canImport = permissions.has(Permission.CAN_IMPORT_DATA);
    const canExport = permissions.has(Permission.CAN_EXPORT_DATA);
    const isSuperAdmin = currentUser?.groupId === 'group-super-admin';

    const NavItem: React.FC<{ icon: React.ReactNode; text: string; view: View; isSubItem?: boolean; badgeCount?: number; }> = ({ icon, text, view, isSubItem = false, badgeCount = 0 }) => {
        const isActive = currentView === view;
        return (
            <li className="relative group">
                <button
                    onClick={() => onNavigate(view)}
                    className={`flex items-center w-full text-left p-3 rounded-md transition-colors ${isSubItem ? 'pl-12' : ''} ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                    {icon}
                    <span className={`ml-4 whitespace-nowrap sidebar-item-text`}>{text}</span>
                    {badgeCount > 0 && !isCollapsed && <span className="ml-auto bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{badgeCount}</span>}
                </button>
                 {isCollapsed && 
                    <>
                        {badgeCount > 0 && <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center text-xs rounded-full bg-green-600 text-white font-bold">{badgeCount > 9 ? '9+' : badgeCount}</span>}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{text}</div>
                    </>
                 }
            </li>
        );
    };
    
     const DataNavItem: React.FC<{ icon: React.ReactNode; text: string; onClick: () => void; isSubItem?: boolean; }> = ({ icon, text, onClick, isSubItem = false }) => {
        return (
            <li className="relative group">
                <button
                    onClick={onClick}
                    className={`flex items-center w-full text-left p-3 rounded-md transition-colors ${isSubItem ? 'pl-12' : ''} text-gray-300 hover:bg-gray-700 hover:text-white`}
                >
                    {icon}
                    <span className={`ml-4 whitespace-nowrap sidebar-item-text`}>{text}</span>
                </button>
                {isCollapsed && <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{text}</div>}
            </li>
        );
    };

    const NavCategory: React.FC<{ text: string }> = ({ text }) => (
        <li className="px-3 pt-4 pb-2">
            <span className={`text-xs font-semibold text-gray-500 uppercase sidebar-category-text`}>{text}</span>
        </li>
    );

    const sidebarClasses = `
        bg-gray-800 text-white flex-shrink-0 flex flex-col z-40
        ${isCollapsed ? 'sidebar-collapsed w-20' : 'w-64'}
        hidden lg:flex sidebar
    `;

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className={sidebarClasses}>
                <div className="flex items-center gap-2 p-4 border-b border-gray-700 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
                    <span className={`text-xl font-bold sidebar-item-text`}>Hapsara</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    <ul className="space-y-1">
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} text="Dashboard" view="dashboard" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} text="Reports & Analytics" view="reports" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} text="Farmer Directory" view="farmer-directory" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} text="Map View" view="map-view" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} text="Subsidy Management" view="subsidy-management" />
                        {canManageAdmin && <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} text={isSuperAdmin ? "Super Admin Panel" : "Admin Panel"} view="admin" />}
                        {canManageContent && <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} text="Content Manager" view="content-manager" />}
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 12h.01M12 12a9 9 0 110-18 9 9 0 010 18z" /></svg>} text="Help & Support" view="help" />

                        {(canImport || canExport || canManageAdmin || canManageContent) && <NavCategory text="Tools" />}
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L11 12l-2 2-2.293-2.293a1 1 0 010-1.414L10 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 19l-2.293-2.293a1 1 0 00-1.414 0L12 21l2-2 2.293 2.293a1 1 0 001.414 0L19 19z" /></svg>} text="Crop Health Scanner" view="crop-health-scanner" />
                        {canImport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} text="Import Data" onClick={onImport} />}
                        {canExport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} text="Export to Excel" onClick={onExportExcel} />}
                        {canExport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>} text="Export to CSV" onClick={onExportCsv} />}
                        {canExport && <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>} text="View Raw Data" onClick={onViewRawData} />}
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6" /></svg>} text="ID Verification" view="id-verification" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} text="Data Health" view="data-health" />
                        <NavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a1 1 0 11-2 0 1 1 0 012 0z" /></svg>} text="Print Queue" view="print-queue" badgeCount={printQueueCount} />
                        
                        <NavCategory text="System" />
                        <DataNavItem icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>} text="Cloud Sync Settings" onClick={onShowSupabaseSettings} />
                    </ul>
                </div>
                
                <div className="mt-auto flex-shrink-0">
                    <div className="p-2 border-t border-gray-700">
                        <div className="relative">
                            {isUserMenuOpen && (
                                <div className={`
                                    absolute z-50 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 bg-gray-700
                                    ${isCollapsed
                                        ? 'left-full bottom-2 ml-2 w-56' // Position to the side when collapsed
                                        : 'bottom-full mb-2 w-full' // Position above when expanded
                                    }
                                `}>
                                    <div className="py-1">
                                        <button onClick={() => { onNavigate('profile'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 rounded-t-md">Settings</button>
                                        <button onClick={() => { onNavigate('billing'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Billing</button>
                                        <button onClick={() => { onNavigate('usage-analytics'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Usage</button>
                                        <div className="border-t border-gray-600 my-1"></div>
                                        <button onClick={() => { onShowChangelog(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">What's New</button>
                                        <button onClick={() => { onShowPrivacy(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600">Privacy</button>
                                        <div className="border-t border-gray-600 my-1"></div>
                                        <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 rounded-b-md">Logout</button>
                                    </div>
                                </div>
                            )}
                             {currentUser && (
                                <button onClick={() => setIsUserMenuOpen(o => !o)} className="flex items-center w-full text-left p-2 rounded-md hover:bg-gray-700">
                                    <img src={currentUser.avatar} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-gray-600 flex-shrink-0" />
                                    <div className={`ml-3 overflow-hidden sidebar-item-text`}>
                                        <p className="font-semibold text-sm text-white whitespace-nowrap">{currentUser.name}</p>
                                        <p className="text-xs text-gray-400 whitespace-nowrap capitalize">Usage-Based Plan</p>
                                    </div>
                                </button>
                             )}
                        </div>
                    </div>
                     <div className="p-2 border-t border-gray-700 relative group">
                        <button onClick={onToggleCollapse} className="flex items-center justify-center w-full p-3 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white">
                            {isCollapsed 
                                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg> 
                                : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            }
                        </button>
                        {isCollapsed && <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Expand</div>}
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
