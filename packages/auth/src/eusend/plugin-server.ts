import type { BetterAuthPlugin } from "better-auth";
import { EusendService } from "./service";
import type { EusendPluginOptions } from "./types";

/**
 * Standard Better Auth server plugin for Eusend email delivery.
 * Automatically wires up emailVerification, emailAndPassword, and user deletion hooks.
 */
export function eusendPlugin(
	options: EusendPluginOptions & { service?: EusendService } = {}
) {
	const service = options?.service ?? new EusendService(options);

	return {
		id: "eusend",
		init: () => ({
			options: {
				emailVerification: {
					sendVerificationEmail: ({ url, user }) =>
						service.sendVerificationEmail({
							url,
							email: user.email,
							expirationMinutes: 30,
						}),
					expiresIn: 30 * 60,
				},
				emailAndPassword: {
					enabled: false,
					sendResetPassword: ({ url, user }) =>
						service.sendResetPassword({
							url,
							email: user.email,
							expirationMinutes: 15,
						}),
					resetPasswordTokenExpiresIn: 15 * 60,
					requireEmailVerification: true,
				},
				user: {
					deleteUser: {
						enabled: false,
						sendDeleteAccountVerification: async ({ url, user }) =>
							service.sendDeleteAccountVerification({
								email: user.email,
								url,
								expirationHours: 24,
							}),
						deleteTokenExpiresIn: 60 * 60 * 24,
					},
				},
			},
			context: { eusend: service },
		}),
	} satisfies BetterAuthPlugin;
}

declare module "better-auth" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface BetterAuthPluginRegistry<AuthOptions, Options> {
		eusend: {
			creator: typeof eusendPlugin;
		};
	}
}
