import { Code, Lock, Rocket, Terminal } from "@gravity-ui/icons";
import type React from "react";

export type ArchitectureFeature = {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	tag: string;
	description: string;
};

export const ARCHITECTURE_FEATURES: ArchitectureFeature[] = [
	{
		icon: Terminal,
		title: "OpenAPI 3.1 & Interactive Docs",
		tag: "Scalar Reference",
		description:
			"Explore and test endpoints in real time with our integrated Scalar reference UI. Export schemas effortlessly for Postman, Insomnia, or custom code generators.",
	},
	{
		icon: Code,
		title: "TypeScript Native SDKs",
		tag: "Type Safety",
		description:
			"Build with complete type confidence. Full input/output schema validation with Zod and TypeScript autocompletion across all engine packages.",
	},
	{
		icon: Rocket,
		title: "High-Throughput",
		tag: "< 45ms TTFB",
		description:
			"Engineered on modern Fastify runtime with optimized JSON serialization, connection pooling, and sub-50ms worldwide edge delivery.",
	},
	{
		icon: Lock,
		title: "Granular Keys & Rate Limiting",
		tag: "RPM Control",
		description:
			"Manage multiple production keys, inspect detailed request logs, configure webhooks, and scale smoothly with flexible RPM quotas.",
	},
];
