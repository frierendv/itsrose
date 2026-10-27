export type OtpType =
	| "sign-in"
	| "email-verification"
	| "forget-password"
	| "change-email"
	| (string & {});

/**
 * Client connection and execution options for @eusend_dev/sdk.
 */
export interface EusendClientOptions {
	/**
	 * API key for Eusend.
	 * Falls back to `process.env.EUSEND_API_KEY`.
	 */
	apiKey?: string;
	/**
	 * Default sender address (e.g. `Acme <auth@acme.com>`).
	 * Must belong to a verified domain on Eusend.
	 */
	from?: string;
	/**
	 * Override the Eusend API host URL. Useful for local staging or proxies.
	 */
	baseUrl?: string;
	/**
	 * Lifecycle execution handler to keep background promises alive
	 * (e.g. Next.js `after`, Vercel `waitUntil`, Cloudflare `ctx.waitUntil`).
	 */
	waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Common branding and app metadata options passed down to email templates.
 */
export interface EusendBrandingOptions {
	/**
	 * Application display name (e.g. "ItsRose").
	 * Defaults to "ItsRose" or `process.env.APP_NAME`.
	 */
	appName?: string;
	/**
	 * Logo URL or dual light/dark variants.
	 */
	logoURL?: string | { light: string; dark: string };
	/**
	 * Support email address displayed in security & notification footers.
	 */
	/**
	 * Whether to render templates in dark mode.
	 */
	darkMode?: boolean;
	/**
	 * Whether to display the "Powered by" footer mark.
	 */
	poweredBy?: boolean;
}

/**
 * Subject generation overrides.
 */
export interface EusendSubjectOverrides {
	verification?:
		| string
		| ((data: { url: string; token?: string; appName: string }) => string);
	resetPassword?:
		| string
		| ((data: { url: string; token?: string; appName: string }) => string);
	magicLink?:
		| string
		| ((data: { url: string; token?: string; appName: string }) => string);
	otp?:
		| string
		| ((data: { otp: string; type?: string; appName: string }) => string);
	passwordChanged?: string | ((data: { appName: string }) => string);
	emailChanged?: string | ((data: { appName: string }) => string);
	deleteAccount?:
		| string
		| ((data: { url: string; token?: string; appName: string }) => string);
	securityAlert?:
		string | ((data: { title: string; appName: string }) => string);
}

/**
 * Full configuration options for the Better Auth Eusend server plugin.
 */
export interface EusendPluginOptions
	extends EusendClientOptions, EusendBrandingOptions {
	/**
	 * Custom email subject overrides.
	 */
	subjects?: EusendSubjectOverrides;
	/**
	 * Default expiration overrides.
	 */
	expiration?: {
		verificationMinutes?: number;
		resetPasswordMinutes?: number;
		magicLinkMinutes?: number;
		otpMinutes?: number;
		deleteAccountHours?: number;
	};
}
