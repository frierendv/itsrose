"use client";

import { Globe, Lock, Pulse, Server } from "@gravity-ui/icons";
import { motion } from "motion/react";

const STATS = [
	{
		label: "Global Latency",
		value: "< 42ms",
		description: "P95 cold-start response across regional edge nodes",
		icon: Pulse,
	},
	{
		label: "Endpoints",
		value: "30+",
		description: "Vision, speech, generative diffusion, and extraction",
		icon: Server,
	},
	{
		label: "Zero-Retention Privacy",
		value: "100%",
		description: "Ephemeral in-memory buffers; zero data training",
		icon: Lock,
	},
	{
		label: "Edge Availability",
		value: "99.99%",
		description: "SLA-backed uptime with multi-cloud failover redundancy",
		icon: Globe,
	},
];

export function StatsBar() {
	return (
		<section
			aria-label="Platform Telemetry"
			className="border-border/60 border-b bg-surface-secondary/40 py-8 backdrop-blur-sm"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{STATS.map((stat, idx) => {
						const Icon = stat.icon;
						return (
							<motion.div
								key={stat.label}
								initial={{ opacity: 0, y: 12 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									duration: 0.4,
									delay: idx * 0.08,
								}}
								className="flex items-start gap-3.5 border-border/40 p-3 sm:border-r last:border-r-0"
							>
								<div className="flex size-10 shrink-0 items-center justify-center border border-border/80 bg-surface text-accent">
									<Icon
										className="size-5"
										aria-hidden="true"
									/>
								</div>
								<div className="flex flex-col text-left">
									<div className="flex items-baseline gap-2">
										<span className="font-bold font-mono text-2xl text-foreground tracking-tight">
											{stat.value}
										</span>
										<span className="font-semibold text-muted text-xs uppercase tracking-wider">
											{stat.label}
										</span>
									</div>
									<p className="mt-1 text-muted text-xs leading-relaxed">
										{stat.description}
									</p>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
