// components/AppModals.tsx
import React from 'react';
import HelpModal from './HelpModal';
import PrivacyModal from './PrivacyModal';
import FeedbackModal from './FeedbackModal';
import SupabaseSettingsModal from './SupabaseSettingsModal';
import InvitationModal from './InvitationModal';
import DiscussModeModal from './DiscussModeModal';
import { User } from '../types';

interface AppModalsProps {
  isSupabaseSettingsOpen: boolean;
  setIsSupabaseSettingsOpen: (isOpen: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (isOpen: boolean) => void;
  isPrivacyModalOpen: boolean;
  setIsPrivacyModalOpen: (isOpen: boolean) => void;
  isFeedbackModalOpen: boolean;
  setIsFeedbackModalOpen: (isOpen: boolean) => void;
  isInvitationModalOpen: boolean;
  setIsInvitationModalOpen: (isOpen: boolean) => void;
  isDiscussModeOpen: boolean;
  setIsDiscussModeOpen: (isOpen: boolean) => void;
  currentUser: User | null;
  appContent: any; // Consider a more specific type if possible
}

const AppModals: React.FC<AppModalsProps> = ({
  isSupabaseSettingsOpen,
  setIsSupabaseSettingsOpen,
  isHelpModalOpen,
  setIsHelpModalOpen,
  isPrivacyModalOpen,
  setIsPrivacyModalOpen,
  isFeedbackModalOpen,
  setIsFeedbackModalOpen,
  isInvitationModalOpen,
  setIsInvitationModalOpen,
  isDiscussModeOpen,
  setIsDiscussModeOpen,
  currentUser,
  appContent,
}) => {
  return (
    <>
      <SupabaseSettingsModal
        isOpen={isSupabaseSettingsOpen}
        onClose={() => setIsSupabaseSettingsOpen(false)}
        onConnect={() => { /* TODO: Implement actual connection logic or lift state up */ }}
      />
      <HelpModal onClose={() => setIsHelpModalOpen(false)} appContent={appContent} />
      <PrivacyModal onClose={() => setIsPrivacyModalOpen(false)} appContent={appContent} />
      <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} />
      {isInvitationModalOpen && (
        <InvitationModal currentUser={currentUser} onClose={() => setIsInvitationModalOpen(false)} />
      )}
      {isDiscussModeOpen && (
        <DiscussModeModal currentUser={currentUser} onClose={() => setIsDiscussModeOpen(false)} />
      )}
    </>
  );
};

export default AppModals;
