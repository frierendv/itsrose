import { z } from "zod/v4";

export const SubscriptionIntervalUnitSchema = z.enum(["day", "week", "month"]);

export type SubscriptionIntervalUnit = z.infer<
	typeof SubscriptionIntervalUnitSchema
>;

/**
 * Billing schedule sent when creating or updating a subscription.
 */
export const SubscriptionScheduleSchema = z.object({
	/**
	 * Subscription's interval given by merchant.
	 */
	interval: z.int().positive(),
	/**
	 * Interval temporal unit.
	 */
	interval_unit: SubscriptionIntervalUnitSchema,
	/**
	 * Maximum interval of subscription. Subscription will end after maximum interval is reached.
	 *
	 * @remarks
	 * If `max_interval` is set to `0` will be executed once.
	 * If `max_interval` is `null` or omitted from the payload, the subscription will
	 * continue indefinitely until manually deactivated.
	 */
	max_interval: z.number().min(0).nullish(),
	/**
	 * Timestamp of subscription in `yyyy-MM-dd HH:mm:ss Z`.
	 *
	 * @remarks
	 * The value must be after the current time. If specified, first payment will happen on `start_time`.
	 * If `start_time` is not specified, the default value for `start_time` will be the date after the first interval after current time.
	 */
	start_time: z.string().optional(),
});
export type SubscriptionSchedule = z.infer<typeof SubscriptionScheduleSchema>;
