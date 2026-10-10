import { z } from "zod/v4";

export const SnapSendEmailSchema = z.object({
	token: z.object({
		/**
		 * Enable sending an email when the Snap token is created.
		 */
		enabled: z.boolean(),
	}),
	reminder: z.object({
		/**
		 * Enable reminder emails.
		 *
		 * @remarks
		 * When set to true, an email is sent after the Snap token is created, based on `reminder.delay`.
		 * An additional email is sent when the Snap token expires.
		 */
		enabled: z.boolean(),
		/**
		 * Reminder delay in minutes, measured from the time the Snap token is created.
		 *
		 * Notes: Must be between 10 and 60 minutes, inclusive.
		 */
		delay: z.int().positive().min(10).max(60),
	}),
});
export type SnapSendEmail = z.infer<typeof SnapSendEmailSchema>;
