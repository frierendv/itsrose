export const adminQueryKeys = {
	all: ["admin"] as const,
	plans: {
		all: ["admin", "plans"] as const,
		list: () => [...adminQueryKeys.plans.all, "list"] as const,
		detail: (plan_id: string) =>
			[...adminQueryKeys.plans.all, "detail", plan_id] as const,
	},
	subscriptions: {
		all: ["admin", "subscriptions"] as const,
		list: (filters?: Record<string, unknown>) =>
			[
				...adminQueryKeys.subscriptions.all,
				"list",
				filters ?? {},
			] as const,
		detail: (id: string) =>
			[...adminQueryKeys.subscriptions.all, "detail", id] as const,
	},
	invoices: {
		all: ["admin", "invoices"] as const,
		list: (filters?: Record<string, unknown>) =>
			[...adminQueryKeys.invoices.all, "list", filters ?? {}] as const,
		detail: (invoice_id: string) =>
			[...adminQueryKeys.invoices.all, "detail", invoice_id] as const,
	},
	events: {
		all: ["admin", "events"] as const,
		list: (filters?: Record<string, unknown>) =>
			[...adminQueryKeys.events.all, "list", filters ?? {}] as const,
	},
	metrics: () => [...adminQueryKeys.all, "metrics"] as const,
};
