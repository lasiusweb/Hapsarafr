// lib/communication.ts
export const generateWhatsAppLink = (mobileNumber: string, message: string) => {
    // Remove non-numeric characters
    const cleanNumber = mobileNumber.replace(/\D/g, '');
    // Ensure country code (assuming India +91 if not present and length is 10)
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
};
