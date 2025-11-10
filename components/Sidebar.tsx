import React, { useState } from 'react';
import { User, Permission } from '../types';

type ViewType = 'dashboard' | 'farmer-directory' | 'register-farmer' | 'profile' | 'admin' | 'farmer-details' | 'print-queue' | 'reports' | 'id-verification' | 'data-health' | 'help' | 'content-manager' | 'geo-management' | 'schema-manager' | 'tenant-management' | 'crop-health' | 'satellite-analysis' | 'yield-prediction' | 'performance-analytics' | 'task-management' | 'financial-ledger' | 'map-view' | 'subsidy-management' | 'assistance-schemes' | 'quality-assessment' | 'processing-transparency' | 'equipment-management'| 'financial-dashboard' | 'agri-store' | 'equipment-access';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: User | null;
  userPermissions: Set<Permission>;
}

const NavItem: React.FC<{
  view: ViewType;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isCollapsed: boolean;
  icon: React.ReactNode;
  text: string;
  requiredPermission?: Permission;
  userPermissions: Set<Permission>;
}> = ({ view, currentView, onNavigate, isCollapsed, icon, text, requiredPermission, userPermissions }) => {
  if (requiredPermission && !userPermissions.has(requiredPermission)) {
    return null;
  }
  const isActive = currentView === view;
  const itemClasses = `
    flex items-center p-2.5 rounded-lg transition-colors group relative
    ${isActive ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
  `;

  return (
    <li>
      <button onClick={() => onNavigate(view)} className={itemClasses} style={{ width: '100%' }} title={text}>
        <div className="flex-shrink-0 w-6 h-6">{icon}</div>
        {!isCollapsed && <span className="ml-3 sidebar-item-text">{text}</span>}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {text}
          </div>
        )}
      </button>
    </li>
  );
};

const SidebarCategory: React.FC<{ text: string; isCollapsed: boolean }> = ({ text, isCollapsed }) => {
  if (isCollapsed) return <hr className="my-3 border-t border-gray-200" />;
  return (
    <h3 className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sidebar-category-text">
      {text}
    </h3>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggleCollapse, currentUser, userPermissions }) => {
  const isSuperAdmin = currentUser?.groupId === 'group-super-admin';
  
  return (
    <>
      <div className={`fixed top-0 left-0 h-full bg-white border-r z-40 sidebar ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between p-4 border-b ${isCollapsed ? 'flex-col gap-2' : ''}`}>
             <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
                {!isCollapsed && <h1 className="text-xl font-bold sidebar-item-text">Hapsara</h1>}
            </div>
            <button onClick={onToggleCollapse} className="p-1 rounded-full text-gray-500 hover:bg-gray-200">
              {isCollapsed ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> :
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              }
            </button>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            <ul>
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} text="Dashboard" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="task-management" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} text="My Tasks" />
                
                <SidebarCategory text="Farmer Management" isCollapsed={isCollapsed} />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="farmer-directory" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} text="Farmer Directory" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="register-farmer" requiredPermission={Permission.CAN_REGISTER_FARMER} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} text="Register Farmer" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="map-view" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} text="Map View" />

                <SidebarCategory text="Farmer Finances" isCollapsed={isCollapsed} />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="financial-dashboard" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} text="Financial Dashboard" />
                 <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="agri-store" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>} text="Agri-Store" />
                 <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="equipment-access" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.34 3.03a1 1 0 01.63 1.265l-4 12a1 1 0 11-1.898-.63L9.34 3.695a1 1 0 011.265-.665zM4 6a1 1 0 011-1h4a1 1 0 110 2H5a1 1 0 01-1-1zm1 4a1 1 0 100 2h3a1 1 0 100-2H5z" clipRule="evenodd" /></svg>} text="Equipment Access" />

                <SidebarCategory text="AI & Analytics" isCollapsed={isCollapsed} />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="reports" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} text="Reports" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="yield-prediction" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} text="Yield Prediction" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="crop-health" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>} text="Crop Health Scanner" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="satellite-analysis" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM15.116 5.337l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM5.337 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708zM17.663 7.884l.003.003.002.002a.5.5 0 10.704-.708l-.004-.003a.5.5 0 00-.704.708z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} text="Satellite Analysis" />

                <SidebarCategory text="Operations" isCollapsed={isCollapsed} />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="subsidy-management" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134 0V7.418zM12.5 8.5h-5a2.5 2.5 0 000 5h5a2.5 2.5 0 000-5zM11 10a1 1 0 11-2 0 1 1 0 012 0z" /><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8 6a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>} text="Subsidy Management" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="assistance-schemes" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 005 18h10a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clipRule="evenodd" /></svg>} text="Assistance Schemes" />
                
                <SidebarCategory text="Processing & Value" isCollapsed={isCollapsed} />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="processing-transparency" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>} text="Processing Hub" />
                <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="equipment-management" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>} text="Equipment Mgmt" />


                {(userPermissions.has(Permission.CAN_MANAGE_USERS) || isSuperAdmin) && (
                    <>
                        <SidebarCategory text="Administration" isCollapsed={isCollapsed} />
                        <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="admin" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} text="Admin Panel" />
                        <NavItem {...{ currentView, onNavigate, isCollapsed, userPermissions }} view="help" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} text="Help & Support" />
                    </>
                )}
            </ul>
          </nav>
          {currentUser && (
            <div className="p-2 border-t">
              <button onClick={() => onNavigate('profile')} className="w-full flex items-center p-2 rounded-lg hover:bg-gray-100">
                <img src={currentUser.avatar} alt="User avatar" className="w-10 h-10 rounded-full" />
                {!isCollapsed && (
                  <div className="ml-3 text-left sidebar-item-text">
                    <p className="font-semibold text-sm">{currentUser.name}</p>
                    <p className="text-xs text-gray-500">View Profile</p>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Overlay for mobile */}
      {!isCollapsed && <div onClick={onToggleCollapse} className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden sidebar-overlay"></div>}
    </>
  );
};

export default Sidebar;