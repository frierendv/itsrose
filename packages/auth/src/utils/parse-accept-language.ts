/**
 *
 * Modified; Stolen from better-auth/plugins {@link https://github.com/better-auth/better-auth/blob/main/packages/i18n/src/index.ts#L24C1-L42C1 | i18n}
 *
 * Parse Accept-Language header and return locales sorted by quality
 */
export function parseAcceptLanguage(header: string | null): string[] {
	if (!header) {
		return [];
	}
	return header
		.split(",")
		.map((part) => {
			const [localeStr, quality = "q=1"] = part.trim().split(";");
			const q = Number.parseFloat(quality.replace("q=", ""));
			// Get base locale (e.g., "en" from "en-US")
			const locale = localeStr?.trim().split("-")[0] ?? "";
			return { locale, q };
		})
		.filter((item) => item.locale.length > 0)
		.sort((a, b) => b.q - a.q)
		.map((item) => item.locale);
}
