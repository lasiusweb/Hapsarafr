import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Permission, Tenant } from '../types';
import SupabaseSettingsModal from './SupabaseSettingsModal';
import HelpModal from './HelpModal';
import PrivacyModal from './PrivacyModal';
import FeedbackModal from './FeedbackModal';
import ChangelogModal from './ChangelogModal';
import { initializeSupabase } from '../lib/supabase';

interface SidebarProps {
    view: string;
    onNavigate: (view: string) => void;
    currentUser: User | undefined;
    currentTenant: Tenant | undefined;
    permissions: Set<Permission>;
    onSync: () => void;
    isSyncing: boolean;
    lastSync: Date | null;
    isOnline: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ view, onNavigate, currentUser, currentTenant, permissions, onSync, isSyncing, lastSync, isOnline }) => {
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768);
    const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
    const [supabase, setSupabase] = useState(() => initializeSupabase());

    const handleSetSupabase = () => {
        setSupabase(initializeSupabase());
    };

    const isPremium = currentTenant?.subscriptionStatus === 'active';

    const navItems = useMemo(() => [
        {
            category: 'Main', items: [
                { view: 'dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>, label: 'Dashboard' },
                { view: 'farmer-directory', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Farmer Directory' },
                { view: 'register-farmer', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>, label: 'Register Farmer', permission: Permission.CAN_REGISTER_FARMER },
            ]
        },
        {
            category: 'Tools & Learning', items: [
                { view: 'tasks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, label: 'Task Board' },
                { view: 'resource-library', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, label: 'Resource Library' },
                { view: 'events', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, label: 'Events Calendar' },
            ]
        },
        {
            category: 'Community', items: [
                { view: 'community', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V10a2 2 0 012-2h8z" /></svg>, label: 'Q&A Forum' },
                { view: 'mentorship', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm-9 5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Mentorship', premium: true },
            ]
        },
        {
            category: 'Marketplace', items: [
                { view: 'marketplace', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Agri-Store' },
                { view: 'financials', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>, label: 'My Wallet' },
            ]
        },
        {
            category: 'Analytics', items: [
                { view: 'reports', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, label: 'Reports' },
                { view: 'data-health', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, label: 'Data Health' },
            ]
        },
         {
            category: 'Organization', items: [
                 { view: 'territory-management', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" /></svg>, label: 'Territory Expansion' },
                 { view: 'billing', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 4h.01M4.88 8.11A5.986 5.986 0 014 11c0 3.314 2.686 6 6 6s6-2.686 6-6c0-1.22-.363-2.344-.986-3.29M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>, label: 'Billing' },
            ]
        },
    ], [permissions, isPremium]);
    
    const sidebarClasses = `bg-gray-800 text-gray-300 flex flex-col h-full shadow-lg z-40 sidebar ${isCollapsed ? 'w-20' : 'w-64'}`;
    const itemClasses = "flex items-center p-3 my-1 rounded-lg transition-colors";
    const activeItemClasses = "bg-green-700 text-white font-semibold shadow-inner";
    const inactiveItemClasses = "hover:bg-gray-700 hover:text-white";
    const disabledItemClasses = "opacity-50 cursor-not-allowed";

    return (
        <>
            <div className={sidebarClasses}>
                <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className={`flex items-center gap-2 ${isCollapsed ? 'hidden' : ''}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
                        <span className="text-xl font-bold text-white">Hapsara</span>
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-lg hover:bg-gray-700">
                        {isCollapsed ? 
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg> : 
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                    </button>
                </div>
                
                <nav className="flex-1 px-3 overflow-y-auto">
                    {navItems.map(cat => {
                        const visibleItems = cat.items.filter(item => !item.permission || permissions.has(item.permission));
                        if (visibleItems.length === 0) return null;
                        return (
                             <div key={cat.category} className="mt-4">
                                <h3 className={`px-3 text-xs font-semibold uppercase text-gray-500 tracking-wider ${isCollapsed ? 'text-center' : ''} sidebar-category-text`}>{isCollapsed ? cat.category.substring(0,1) : cat.category}</h3>
                                {visibleItems.map(item => {
                                    const isDisabled = item.premium && !isPremium;
                                    return (
                                        <div key={item.view} className="relative group" title={isDisabled ? 'This is a premium feature. Please upgrade your plan.' : item.label}>
                                            <button
                                                onClick={() => !isDisabled && onNavigate(item.view)}
                                                disabled={isDisabled}
                                                className={`${itemClasses} ${view === item.view ? activeItemClasses : inactiveItemClasses} ${isDisabled ? disabledItemClasses : ''} w-full`}
                                            >
                                                {item.icon}
                                                <span className={`ml-4 flex-1 text-left sidebar-item-text ${isCollapsed ? 'hidden' : ''}`}>{item.label}</span>
                                                {item.premium && !isCollapsed && <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-md">PRO</span>}
                                            </button>
                                            {isCollapsed && <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}{item.premium && ' (Premium)'}</div>}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </nav>
                 {/* ... Modals and other elements */}
            </div>
        </>
    );
};

export default Sidebar;