import { z } from "zod/v4";
import { SubscriptionScheduleSchema } from "../../subscription";

export const SnapRecurringSchema = SubscriptionScheduleSchema.pick({
	interval_unit: true,
	start_time: true,
})
	.partial()
	.extend({
		required: z.boolean(),
	});
export type SnapRecurring = z.infer<typeof SnapRecurringSchema>;
