export const queryKeys = {
	billing: {
		all: ["billing"] as const,
		subscription: () => [...queryKeys.billing.all, "subscription"] as const,
		invoices: (status?: string) =>
			[...queryKeys.billing.all, "invoices", status ?? "all"] as const,
		plans: () => [...queryKeys.billing.all, "plans"] as const,
	},
	tts: {
		all: ["elevenlabs-audio"] as const,
		models: () => [...queryKeys.tts.all, "models"] as const,
		voices: (category: string) =>
			[...queryKeys.tts.all, "voices", category] as const,
		generate: () => [...queryKeys.tts.all, "generate"] as const,
	},
	admin: {
		all: ["admin"] as const,
		plans: () => [...queryKeys.admin.all, "plans"] as const,
		subscriptions: (filters?: Record<string, unknown>) =>
			[...queryKeys.admin.all, "subscriptions", filters ?? {}] as const,
		invoices: (filters?: Record<string, unknown>) =>
			[...queryKeys.admin.all, "invoices", filters ?? {}] as const,
	},
};
