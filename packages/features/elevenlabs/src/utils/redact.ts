/**
 * Removes what must not leave the platform from a piece of text.
 *
 * Voices are community content: their name and their description may carry
 * an email address, a phone number or a link, none of which belongs in an
 * API answer.
 *
 * @param text The text to redact.
 * @returns The text without the personal data.
 */
export const redact = (text: string) =>
	text
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
		.replace(/\b(?:\+?\d[\d\s()-]{7,}\d)\b/g, "[PHONE]")
		.replace(/\bhttps?:\/\/\S+/gi, "[URL]");
