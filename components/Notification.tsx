import React, { useEffect } from 'react';

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onDismiss: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000); // Auto-dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const baseClasses = "fixed top-5 right-5 z-[100] max-w-sm p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-down";
    const typeClasses = {
        success: "bg-green-100 border border-green-200 text-green-800",
        error: "bg-red-100 border border-red-200 text-red-800",
        info: "bg-blue-100 border border-blue-200 text-blue-800",
    };

    const Icon = () => {
        switch(type) {
            case 'success': return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
            case 'error': return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
            case 'info': return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
        }
        return null;
    }

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
            <Icon />
            <span className="font-semibold text-sm">{message}</span>
             <button onClick={onDismiss} className="ml-auto p-1 rounded-full hover:bg-black/10">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>
    );
};

export default Notification;
