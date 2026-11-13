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
	users: {
		all: ["admin", "users"] as const,
		detail: (user_id: string) =>
			[...adminQueryKeys.users.all, "detail", user_id] as const,
		subscription: (user_id: string) =>
			[...adminQueryKeys.users.all, "subscription", user_id] as const,
	},
	metrics: () => [...adminQueryKeys.all, "metrics"] as const,
	usage: {
		all: ["admin", "usage"] as const,
		rates: () => [...adminQueryKeys.usage.all, "rates"] as const,
		settlements: (filters?: Record<string, unknown>) =>
			[
				...adminQueryKeys.usage.all,
				"settlements",
				filters ?? {},
			] as const,
	},
};
