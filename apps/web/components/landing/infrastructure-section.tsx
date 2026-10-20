"use client";

import { CardSpotlight } from "@/components/ui/card-spotlight";
import {
	ArrowsRotateRight,
	CircleCheck,
	Globe,
	Lock,
	Pulse,
	ShieldCheck,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useState } from "react";

type RegionProbe = {
	city: string;
	code: string;
	continent: string;
	basePing: number;
	jitter: number;
};

const PROBES: RegionProbe[] = [
	{
		city: "Tokyo",
		code: "HND-AP1",
		continent: "Asia Pacific",
		basePing: 18,
		jitter: 2,
	},
	{
		city: "Frankfurt",
		code: "FRA-EU1",
		continent: "Europe",
		basePing: 24,
		jitter: 3,
	},
	{
		city: "San Jose",
		code: "SJC-US1",
		continent: "North America",
		basePing: 31,
		jitter: 2,
	},
	{
		city: "Singapore",
		code: "SIN-AP2",
		continent: "Southeast Asia",
		basePing: 22,
		jitter: 1,
	},
	{
		city: "São Paulo",
		code: "GRU-SA1",
		continent: "South America",
		basePing: 58,
		jitter: 4,
	},
	{
		city: "Sydney",
		code: "SYD-OC1",
		continent: "Oceania",
		basePing: 62,
		jitter: 5,
	},
];

export function InfrastructureSection() {
	const [isRunningTest, setIsRunningTest] = useState(false);
	const [probeResults, setProbeResults] = useState<Record<string, number>>({
		"HND-AP1": 19,
		"FRA-EU1": 25,
		"SJC-US1": 32,
		"SIN-AP2": 23,
		"GRU-SA1": 59,
		"SYD-OC1": 64,
	});

	const handleRunPingTest = () => {
		setIsRunningTest(true);
		setTimeout(() => {
			const updated: Record<string, number> = {};
			for (const probe of PROBES) {
				const randomJitter =
					Math.floor(Math.random() * probe.jitter * 2) - probe.jitter;
				updated[probe.code] = Math.max(
					12,
					probe.basePing + randomJitter
				);
			}
			setProbeResults(updated);
			setIsRunningTest(false);
		}, 600);
	};

	return (
		<section
			id="architecture"
			aria-labelledby="arch-heading"
			className="border-border/60 border-b py-20 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
					{/* Left Column: Architecture Highlights */}
					<div className="flex flex-col items-start text-left lg:col-span-6">
						<div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-xs">
							<Globe className="size-3.5 text-accent" />
							<span className="font-semibold text-accent uppercase tracking-wider">
								Infrastructure
							</span>
						</div>

						<h2
							id="arch-heading"
							className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl"
						>
							Built on Global Anycast. Tuned for Milliseconds.
						</h2>

						<p className="mt-4 text-base text-muted leading-relaxed">
							Our edge network terminates TLS handshakes within
							single-digit milliseconds of your users. Requests
							are dispatched instantly to pre-warmed GPU execution
							nodes with zero orchestrator delays.
						</p>

						<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="border border-border bg-surface p-4">
								<div className="flex items-center gap-2">
									<Pulse className="size-4 text-accent" />
									<span className="font-semibold text-foreground text-sm">
										Warm GPU Pools
									</span>
								</div>
								<p className="mt-2 text-muted text-xs leading-relaxed">
									Eliminates container cold boots by
									maintaining hot model memory resident across
									edge regions.
								</p>
							</div>

							<div className="border border-border bg-surface p-4">
								<div className="flex items-center gap-2">
									<ShieldCheck className="size-4 text-accent" />
									<span className="font-semibold text-foreground text-sm">
										Isolated Containers
									</span>
								</div>
								<p className="mt-2 text-muted text-xs leading-relaxed">
									Every payload executes in an ephemeral
									sandboxed microVM, guaranteeing multi-tenant
									privacy.
								</p>
							</div>

							<div className="border border-border bg-surface p-4">
								<div className="flex items-center gap-2">
									<Lock className="size-4 text-accent" />
									<span className="font-semibold text-foreground text-sm">
										Zero-Log Storage
									</span>
								</div>
								<p className="mt-2 text-muted text-xs leading-relaxed">
									No prompt or input file ever touches
									persistent disk, adhering to strict
									enterprise compliance.
								</p>
							</div>

							<div className="border border-border bg-surface p-4">
								<div className="flex items-center gap-2">
									<CircleCheck className="size-4 text-accent" />
									<span className="font-semibold text-foreground text-sm">
										99.99% Guaranteed SLA
									</span>
								</div>
								<p className="mt-2 text-muted text-xs leading-relaxed">
									Multi-cloud failover reroutes traffic
									automatically around network outages and
									provider faults.
								</p>
							</div>
						</div>
					</div>

					{/* Right Column: Interactive Regional Latency Benchmark */}
					<div className="lg:col-span-6">
						<CardSpotlight className="p-6">
							<div className="flex items-center justify-between border-border border-b pb-4">
								<div>
									<div className="font-bold text-foreground text-base">
										Edge Region Latency Matrix
									</div>
									<div className="mt-0.5 text-muted text-xs">
										Live Time-to-First-Byte (TTFB) telemetry
									</div>
								</div>

								<Button
									size="sm"
									onPress={handleRunPingTest}
									isDisabled={isRunningTest}
									className="gap-1.5 font-semibold text-xs"
								>
									<ArrowsRotateRight
										className={`size-3.5 ${isRunningTest ? "animate-spin" : ""}`}
									/>
									{isRunningTest
										? "Probing..."
										: "Probe Regions"}
								</Button>
							</div>

							{/* Region Probe List */}
							<div className="mt-4 divide-y divide-border/60">
								{PROBES.map((probe) => {
									const ping =
										probeResults[probe.code] ??
										probe.basePing;
									return (
										<div
											key={probe.code}
											className="flex items-center justify-between py-3 text-xs"
										>
											<div className="flex items-center gap-3">
												<div className="size-2 rounded-full bg-accent" />
												<div>
													<div className="font-semibold text-foreground">
														{probe.city}
													</div>
													<div className="font-mono text-[10px] text-muted">
														{probe.code} &bull;{" "}
														{probe.continent}
													</div>
												</div>
											</div>

											<div className="flex items-center gap-4">
												{/* Latency bar */}
												<div className="hidden h-1.5 w-24 bg-surface-secondary sm:block">
													<div
														className="h-1.5 bg-accent transition-all duration-500"
														style={{
															width: `${Math.min(100, (ping / 80) * 100)}%`,
														}}
													/>
												</div>

												<div className="text-right">
													<div className="font-bold font-mono text-accent text-xs">
														{ping}ms
													</div>
													<div className="font-mono text-[10px] text-muted">
														TLS 1.3
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<div className="mt-4 flex items-center justify-between border-border border-t pt-4 text-[11px] text-muted">
								<span>TCP BBR Congestion Control Active</span>
								<span className="font-mono">
									Anycast IP: 198.51.100.2
								</span>
							</div>
						</CardSpotlight>
					</div>
				</div>
			</div>
		</section>
	);
}
