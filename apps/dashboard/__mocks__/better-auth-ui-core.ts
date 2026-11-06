/**
 * Test stand-in for `@better-auth-ui/core`, which ships ESM only.
 *
 * Mirrors the library's default `viewPaths.auth` values.
 */
export const viewPaths = {
	auth: {
		callback: "callback",
		error: "error",
		redirect: "redirect",
		signIn: "sign-in",
		signUp: "sign-up",
		forgotPassword: "forgot-password",
		resetPassword: "reset-password",
		resetLinkSent: "reset-link-sent",
		signOut: "sign-out",
		verifyEmail: "verify-email",
	},
} as const;
