// hooks/useAppModals.ts
import { useState, useCallback } from 'react';

interface UseAppModalsResult {
  isSupabaseSettingsOpen: boolean;
  openSupabaseSettings: () => void;
  closeSupabaseSettings: () => void;

  isHelpModalOpen: boolean;
  openHelpModal: () => void;
  closeHelpModal: () => void;

  isPrivacyModalOpen: boolean;
  openPrivacyModal: () => void;
  closePrivacyModal: () => void;

  isFeedbackModalOpen: boolean;
  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;

  isInvitationModalOpen: boolean;
  openInvitationModal: () => void;
  closeInvitationModal: () => void;

  isDiscussModeOpen: boolean;
  openDiscussModal: () => void;
  closeDiscussModal: () => void;
}

export const useAppModals = (): UseAppModalsResult => {
  const [isSupabaseSettingsOpen, setIsSupabaseSettingsOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isDiscussModeOpen, setIsDiscussModeOpen] = useState(false);

  const openSupabaseSettings = useCallback(() => setIsSupabaseSettingsOpen(true), []);
  const closeSupabaseSettings = useCallback(() => setIsSupabaseSettingsOpen(false), []);

  const openHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
  const closeHelpModal = useCallback(() => setIsHelpModalOpen(false), []);

  const openPrivacyModal = useCallback(() => setIsPrivacyModalOpen(true), []);
  const closePrivacyModal = useCallback(() => setIsPrivacyModalOpen(false), []);

  const openFeedbackModal = useCallback(() => setIsFeedbackModalOpen(true), []);
  const closeFeedbackModal = useCallback(() => setIsFeedbackModalOpen(false), []);

  const openInvitationModal = useCallback(() => setIsInvitationModalOpen(true), []);
  const closeInvitationModal = useCallback(() => setIsInvitationModalOpen(false), []);

  const openDiscussModal = useCallback(() => setIsDiscussModeOpen(true), []);
  const closeDiscussModal = useCallback(() => setIsDiscussModeOpen(false), []);

  return {
    isSupabaseSettingsOpen, openSupabaseSettings, closeSupabaseSettings,
    isHelpModalOpen, openHelpModal, closeHelpModal,
    isPrivacyModalOpen, openPrivacyModal, closePrivacyModal,
    isFeedbackModalOpen, openFeedbackModal, closeFeedbackModal,
    isInvitationModalOpen, openInvitationModal, closeInvitationModal,
    isDiscussModeOpen, openDiscussModal, closeDiscussModal,
  };
};
