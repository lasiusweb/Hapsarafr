import React from 'react';
import { AppContent } from '../types';
import { sanitizeHTML } from '../lib/utils';

const PrivacyModal: React.FC<{ onClose: () => void; appContent: Partial<AppContent> | null; }> = ({ onClose, appContent }) => {
    const defaultContent = {
        privacyPolicy: `<p>Your privacy is important to us. This policy explains what personal data Hapsara collects from you, through our interactions with you and through our products, and how we use that data.</p><h3 class="font-bold text-gray-800 mt-4">Personal Data We Collect</h3><p>Hapsara collects data to operate effectively. You provide some of this data directly, such as when you create an account. This includes your name and email address. We do not share your personal information with third parties.</p><h3 class="font-bold text-gray-800 mt-4">How We Use Personal Data</h3><p>We use the data we collect to provide and improve the services we offer. It is also used for auditing and security purposes to ensure the integrity of the farmer registration data.</p>`
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Privacy Policy</h2>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-gray-600">
                   <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(appContent?.privacy_policy || defaultContent.privacyPolicy) }} />
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyModal;