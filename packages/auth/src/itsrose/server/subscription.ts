import type { BillingInterval } from "../types";

/**
 * Calculates subscription period dates from paid date and interval.
 */
export function calculateSubscriptionPeriod(
	paidDateInput: string | Date,
	interval: BillingInterval = "month"
) {
	const periodStart = new Date(paidDateInput);
	const periodEnd = new Date(periodStart);

	if (interval === "year") {
		periodEnd.setFullYear(periodEnd.getFullYear() + 1);
	} else {
		periodEnd.setMonth(periodEnd.getMonth() + 1);
	}

	const now = new Date();
	const isActive = periodEnd.getTime() > now.getTime();

	return {
		periodStart,
		periodEnd,
		isActive,
	};
}
