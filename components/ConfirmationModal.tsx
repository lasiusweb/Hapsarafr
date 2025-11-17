import React from 'react';
import { Modal, ModalHeader, ModalTitle, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    confirmButtonVariant?: 'default' | 'destructive';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    confirmButtonVariant = 'default',
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onCancel}>
            <ModalHeader>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                       <svg className="h-6 w-6 text-red-600" xmlns="http://www.w.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-grow">
                        <ModalTitle>{title}</ModalTitle>
                        <div className="text-gray-600 mt-2">{message}</div>
                    </div>
                </div>
            </ModalHeader>
            <ModalFooter>
                <Button variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button variant={confirmButtonVariant} onClick={onConfirm}>
                    {confirmText}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ConfirmationModal;