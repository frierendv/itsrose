export type OtpType =
	| "sign-in"
	| "email-verification"
	| "forget-password"
	| "change-email"
	| (string & {});

/**
 * Client connection and execution options for the Eusend SDK.
 */
export interface MailerClientOptions {
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
export interface MailerBrandingOptions {
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
export interface MailerSubjectOverrides {
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
 * Full configuration options for the Better Auth mailer server plugin.
 */
export interface MailerPluginOptions
	extends MailerClientOptions, MailerBrandingOptions {
	/**
	 * Custom email subject overrides.
	 */
	subjects?: MailerSubjectOverrides;
	/**
	 * Observes delivery failures. Background sends never throw into the auth
	 * flow; unreported failures are emitted as a process warning.
	 */
	onError?: (error: unknown) => void;
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

/* Deprecated `Eusend*` names kept for source compatibility. */
export type EusendClientOptions = MailerClientOptions;
export type EusendBrandingOptions = MailerBrandingOptions;
export type EusendSubjectOverrides = MailerSubjectOverrides;
export type EusendPluginOptions = MailerPluginOptions;
