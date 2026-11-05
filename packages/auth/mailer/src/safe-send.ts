/**
 * Wraps a mailer callback so delivery failures never fail the auth flow.
 *
 * Better Auth runs these callbacks in a background context; an unhandled
 * rejection there would otherwise crash the process (for example when no
 * `EUSEND_API_KEY` is configured, or the provider is unreachable).
 */
export type MailerErrorReporter = (error: unknown) => void;

const reportToStderr: MailerErrorReporter = (error) => {
	process.emitWarning(
		error instanceof Error ? error : new Error(String(error))
	);
};

export function createSafeMailerHandler<TArgs extends unknown[]>(
	handler: (...args: TArgs) => Promise<void>,
	onError: MailerErrorReporter = reportToStderr
): (...args: TArgs) => Promise<void> {
	return async (...args: TArgs): Promise<void> => {
		try {
			await handler(...args);
		} catch (error) {
			onError(error);
		}
	};
}
