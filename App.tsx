


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
import { useAppModals } from './hooks/useAppModals';
import { useAppState } from './hooks/useAppState';
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
    const {
        printQueue,
        setPrintQueue,
        newlyAddedFarmerId,
        setNewlyAddedFarmerId,
        appContent,
        setAppContent,
        onHighlightComplete,
        onClearPrintQueue,
    } = useAppState();

    const [pendingInvitation, setPendingInvitation] = useState<string | null>(null);

    const {
        isSupabaseSettingsOpen, openSupabaseSettings, closeSupabaseSettings,
        isHelpModalOpen, openHelpModal, closeHelpModal,
        isPrivacyModalOpen, openPrivacyModal, closePrivacyModal,
        isFeedbackModalOpen, openFeedbackModal, closeFeedbackModal,
        isInvitationModalOpen, openInvitationModal, closeInvitationModal,
        isDiscussModeOpen, openDiscussModal, closeDiscussModal,
    } = useAppModals();

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
                onOpenHelp={openHelpModal}
                onOpenDiscuss={openDiscussModal}
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
                    onHighlightComplete={onHighlightComplete}
                    appContent={appContent}
                />
            </main>

            {/* Global Modals */}
            <AppModals
                isSupabaseSettingsOpen={isSupabaseSettingsOpen}
                setIsSupabaseSettingsOpen={closeSupabaseSettings}
                isHelpModalOpen={isHelpModalOpen}
                setIsHelpModalOpen={closeHelpModal}
                isPrivacyModalOpen={isPrivacyModalOpen}
                setIsPrivacyModalOpen={closePrivacyModal}
                isFeedbackModalOpen={isFeedbackModalOpen}
                setIsFeedbackModalOpen={closeFeedbackModal}
                isInvitationModalOpen={isInvitationModalOpen}
                setIsInvitationModalOpen={closeInvitationModal}
                isDiscussModeOpen={isDiscussModeOpen}
                setIsDiscussModeOpen={closeDiscussModal}
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
