export const SUBSCRIPTION_FILTER_BY_STATUS = [
	{ id: "all", label: "All" },
	{ id: "active", label: "Active" },
	{ id: "pending_payment", label: "Pending Payment" },
	{ id: "past_due", label: "Past Due" },
	{ id: "expired", label: "Expired" },
	{ id: "canceled", label: "Canceled" },
] as const;

export const INVOICE_FILTER_BY_STATUS = [
	{ id: "all", label: "All" },
	{ id: "pending", label: "Pending" },
	{ id: "paid", label: "Paid" },
	{ id: "voided", label: "Voided" },
	{ id: "expired", label: "Expired" },
] as const;

export const INVOICE_FILTER_BY_TYPE = [
	{ id: "ALL", label: "All" },
	{ id: "NEW", label: "New" },
	{ id: "UPGRADE", label: "Upgrade" },
	{ id: "RENEWAL", label: "Renewal" },
	{ id: "USAGE", label: "Usage" },
] as const;

export const EVENT_FILTER_BY_KIND = [
	{ id: "all", label: "All" },
	{ id: "settlement", label: "Settlement" },
	{ id: "pending", label: "Pending" },
	{ id: "failed", label: "Failed" },
	{ id: "voided", label: "Voided" },
	{ id: "not_found", label: "Not Found" },
] as const;
