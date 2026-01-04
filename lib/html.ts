// lib/html.ts
import DOMPurify from 'dompurify';

export const sanitizeHTML = (html: string) => {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'b', 'i', 'br'],
    });
};
