import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

/**
 * Product descriptions are authored as HTML by admin/vendor dashboards (a WYSIWYG
 * editor with a raw-HTML "code" mode) and rendered with dangerouslySetInnerHTML on
 * the storefront PDP. Without server-side sanitization, any vendor could store a
 * <script>/onerror payload that executes in every customer's browser — this is the
 * actual trust boundary, not the editor UI. Allowed tags match what the storefront
 * PDP actually styles (paragraphs, lists) plus basic inline emphasis and links.
 */
const ALLOWED_DESCRIPTION_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a'];

export const sanitizeDescriptionHtml = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: ALLOWED_DESCRIPTION_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    },
  }).trim();

export const descriptionSchema = z.object({
  en: z.string().min(1, 'English value is required').transform(sanitizeDescriptionHtml),
  ar: z.string().min(1, 'Arabic value is required').transform(sanitizeDescriptionHtml),
});

export const optionalDescriptionSchema = descriptionSchema.optional();
