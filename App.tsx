


import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes } from 'react-router-dom'; // Only need Routes from react-router-dom for the main App component, specific Route and Navigate from AppRoutes
import Sidebar from './components/Sidebar';
import { User } from './types'; // Only User type is directly used for currentUser prop
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { getSupabase } from './lib/supabase';
import LoginScreen from './components/LoginScreen';
import Notification from './components/Notification';
import AcceptInvitation from './components/AcceptInvitation';
import AppModals from './components/AppModals';
import { useAuth } from './hooks/useAuth';
import { useSecurityKillSwitch } from './hooks/useSecurityKillSwitch';
import { useNotification } from './hooks/useNotification';
import AppRoutes from './routes/AppRoutes'; // Import the new AppRoutes component

// Main App Content (Inside Router)
const AppContent = () => {
    const database = useDatabase();
    const isOnline = useOnlineStatus();
    const location = useLocation();
    const navigate = useNavigate();

    const {
        currentUser,
        currentTenant,
        permissions,
        users,
        tenants,
        setCurrentUser,
        setCurrentTenant, // Keep for potential future use if login changes
        setPermissions, // Keep for potential future use if login changes
        setUsers, // Keep for potential future use if login changes
        setTenants, // Keep for potential future use if login changes
        handleLogout,
        isLoadingAuth,
    } = useAuth();

    const { notification, setNotification, dismissNotification } = useNotification();
    const [printQueue, setPrintQueue] = useState<string[]>([]);
    const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);

    const [pendingInvitation, setPendingInvitation] = useState<string | null>(null);
    const [appContent, setAppContent] = useState<any>(null);

    // Modals state, pass setters to AppModals to manage open/close
    const [isSupabaseSettingsOpen, setIsSupabaseSettingsOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
    const [isDiscussModeOpen, setIsDiscussModeOpen] = useState(false);

    useSecurityKillSwitch(); // Use the new hook

    const handleNavigate = (path: string) => navigate(`/${path}`);

    if (isLoadingAuth) {
        return <div className="flex items-center justify-center h-screen text-lg">Loading authentication...</div>;
    }

    if (!currentUser) {
        if (pendingInvitation) {
            return <AcceptInvitation invitationCode={pendingInvitation} onAccept={() => setPendingInvitation(null)} />;
        }
        return <LoginScreen supabase={getSupabase()} setCurrentUser={setCurrentUser} />; // Pass setCurrentUser for login success
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar
                currentUser={currentUser}
                permissions={permissions}
                isOnline={isOnline}
                printQueueLength={printQueue.length}
                onLogout={handleLogout}
                onOpenHelp={() => setIsHelpModalOpen(true)}
                onOpenDiscuss={() => setIsDiscussModeOpen(true)}
            />
            <main className="flex-1 overflow-y-auto relative">
                {notification && <Notification message={notification.message} type={notification.type} onDismiss={dismissNotification} />}
                <AppRoutes
                    currentUser={currentUser}
                    permissions={permissions}
                    tenants={tenants}
                    users={users}
                    setNotification={setNotification}
                    printQueue={printQueue}
                    newlyAddedFarmerId={newlyAddedFarmerId}
                    onHighlightComplete={() => setNewlyAddedFarmerId(null)}
                    appContent={appContent}
                />
            </main>

            {/* Global Modals */}
            <AppModals
                isSupabaseSettingsOpen={isSupabaseSettingsOpen}
                setIsSupabaseSettingsOpen={setIsSupabaseSettingsOpen}
                isHelpModalOpen={isHelpModalOpen}
                setIsHelpModalOpen={setIsHelpModalOpen}
                isPrivacyModalOpen={isPrivacyModalOpen}
                setIsPrivacyModalOpen={setIsPrivacyModalOpen}
                isFeedbackModalOpen={isFeedbackModalOpen}
                setIsFeedbackModalOpen={setIsFeedbackModalOpen}
                isInvitationModalOpen={isInvitationModalOpen}
                setIsInvitationModalOpen={setIsInvitationModalOpen}
                isDiscussModeOpen={isDiscussModeOpen}
                setIsDiscussModeOpen={setIsDiscussModeOpen}
                currentUser={currentUser}
                appContent={appContent}
            />
        </div>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
