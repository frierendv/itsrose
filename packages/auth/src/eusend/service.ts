import {
	DeleteAccountVerificationEmail,
	EmailVerificationEmail,
	MagicLinkEmail,
	ResetPasswordEmail,
	type DeleteAccountVerificationEmailProps,
	type EmailVerificationEmailProps,
	type MagicLinkEmailProps,
	type ResetPasswordEmailProps,
} from "@better-auth-ui/heroui/email";
import { createElement, type ReactElement } from "react";
import { EusendClient } from "./client";
import { renderEmail } from "./renderer";
import type { EusendPluginOptions } from "./types";

/**
 * High-level orchestration service for rendering templates and dispatching emails via Eusend.
 */
export class EusendService {
	public readonly client: EusendClient;
	public readonly options: EusendPluginOptions;

	constructor(options: EusendPluginOptions = {}) {
		this.options = options;
		this.client = new EusendClient({
			apiKey: options.apiKey,
			from: options.from,
			baseUrl: options.baseUrl,
			waitUntil: options.waitUntil,
		});
	}

	/**
	 * Resolves branding options merging defaults with per-call overrides.
	 */
	private getBranding() {
		return {
			appName: this.options.appName ?? "ItsRose",
			logoURL: this.options.logoURL ?? undefined,
			darkMode: this.options.darkMode ?? false,
			poweredBy: this.options.poweredBy ?? false,
		};
	}

	/**
	 * Generic dispatch method: renders a React Email component and sends via Eusend.
	 */
	public async send(params: {
		to: string | string[];
		subject: string;
		component: ReactElement;
		category: string;
		from?: string;
		replyTo?: string | string[];
		headers?: Record<string, string>;
	}): Promise<void> {
		try {
			const { html, text } = await renderEmail(params.component);
			this.client.send({
				to: params.to,
				subject: params.subject,
				html,
				text,
				from: params.from ?? this.options.from ?? "",
				replyTo: params.replyTo,
				headers: params.headers,
				tags: { source: "better-auth", category: params.category },
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			throw new Error(`[Eusend] Failed to send email: ${message}`, {
				cause: error,
			});
		}
	}

	/**
	 * Dispatches an email verification link.
	 */
	public async sendVerificationEmail(
		props: EmailVerificationEmailProps
	): Promise<void> {
		const branding = this.getBranding();
		const expirationMinutes =
			props.expirationMinutes ??
			this.options.expiration?.verificationMinutes ??
			60;

		const defaultSubject = `Verify your email for ${branding.appName}`;
		const subjectOverride = this.options.subjects?.verification;
		const subject =
			typeof subjectOverride === "function"
				? subjectOverride({ url: props.url, appName: branding.appName })
				: (subjectOverride ?? defaultSubject);

		const component = createElement(EmailVerificationEmail, {
			url: props.url,
			email: props.email,
			expirationMinutes,
			...branding,
		});

		return this.send({
			to: props.email ?? "",
			subject,
			component,
			category: "verification-email",
		});
	}

	/**
	 * Dispatches a password reset link.
	 */
	public async sendResetPassword(
		props: ResetPasswordEmailProps
	): Promise<void> {
		const branding = this.getBranding();
		const expirationMinutes =
			props.expirationMinutes ??
			this.options.expiration?.resetPasswordMinutes ??
			// fallback to resetPasswordTokenExpiresIn default
			15;

		const defaultSubject = `Reset your password for ${branding.appName}`;
		const subjectOverride = this.options.subjects?.resetPassword;
		const subject =
			typeof subjectOverride === "function"
				? subjectOverride({ url: props.url, appName: branding.appName })
				: (subjectOverride ?? defaultSubject);

		const component = createElement(ResetPasswordEmail, {
			url: props.url,
			email: props.email,
			...branding,
			expirationMinutes,
		});

		return this.send({
			to: props.email ?? "",
			subject,
			component,
			category: "reset-password",
		});
	}

	/**
	 * Dispatches a passwordless magic login link.
	 */
	public async sendMagicLink(input: MagicLinkEmailProps): Promise<void> {
		const branding = this.getBranding();
		const expirationMinutes =
			input.expirationMinutes ??
			this.options.expiration?.magicLinkMinutes ??
			15;

		const defaultSubject = `Your sign-in link for ${branding.appName}`;
		const subjectOverride = this.options.subjects?.magicLink;
		const subject =
			typeof subjectOverride === "function"
				? subjectOverride({ url: input.url, appName: branding.appName })
				: (subjectOverride ?? defaultSubject);

		const component = createElement(MagicLinkEmail, {
			url: input.url,
			email: input.email,
			...branding,
			expirationMinutes,
		});

		return this.send({
			to: input.email ?? "",
			subject,
			component,
			category: "magic-link",
		});
	}

	/**
	 * Dispatches an account deletion confirmation email.
	 */
	public async sendDeleteAccountVerification(
		input: DeleteAccountVerificationEmailProps
	): Promise<void> {
		const branding = this.getBranding();
		const expirationHours =
			input.expirationHours ??
			this.options.expiration?.deleteAccountHours ??
			// fallback to 60 * 60 * 24 better auth default "1 day"
			24;

		const defaultSubject = `Confirm account deletion - ${branding.appName}`;
		const subjectOverride = this.options.subjects?.deleteAccount;
		const subject =
			typeof subjectOverride === "function"
				? subjectOverride({ url: input.url, appName: branding.appName })
				: (subjectOverride ?? defaultSubject);

		const component = createElement(DeleteAccountVerificationEmail, {
			url: input.url,
			email: input.email,
			...branding,
			expirationHours,
		});

		return this.send({
			to: input.email ?? "",
			subject,
			component,
			category: "delete-account",
		});
	}
}
