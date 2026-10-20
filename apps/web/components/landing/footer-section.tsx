"use client";

import { LogoIcon } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { config } from "@/config/site";
import NextLink from "next/link";

export function FooterSection() {
	return (
		<footer
			aria-labelledby="footer-heading"
			className="border-border/60 border-t bg-surface text-left"
		>
			<h2 id="footer-heading" className="sr-only">
				Footer
			</h2>

			<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
					{/* Brand Column */}
					<div className="flex flex-col items-start lg:col-span-2">
						<NextLink
							href="/"
							className="flex items-center gap-2 font-bold text-foreground text-lg transition-colors hover:text-accent"
						>
							<LogoIcon size={24} aria-hidden />
							<span>{config.appName}</span>
						</NextLink>

						<p className="mt-3 max-w-sm text-muted text-xs leading-relaxed">
							The developer cloud for multimodal AI inference,
							computer vision, and structured web extraction.
							Sub-50ms latency with zero data retention.
						</p>

						{/* System Status Pill */}
						<div className="mt-6 inline-flex items-center gap-2 border border-border bg-surface-secondary px-3 py-1 text-xs">
							<span className="relative flex size-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
								<span className="relative inline-flex size-2 rounded-full bg-green-500" />
							</span>
							<span className="font-mono text-[11px] text-foreground">
								All Systems Operational
							</span>
						</div>
					</div>

					{/* Column 1: APIs & Models */}
					<div>
						<h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
							APIs & Models
						</h3>
						<ul className="mt-4 space-y-2.5 text-xs">
							<li>
								<NextLink
									href="#capabilities"
									className="text-muted transition-colors hover:text-foreground"
								>
									FLUX.1 Schnell
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#capabilities"
									className="text-muted transition-colors hover:text-foreground"
								>
									Multilingual OCR
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#capabilities"
									className="text-muted transition-colors hover:text-foreground"
								>
									Neural Text-to-Speech
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#capabilities"
									className="text-muted transition-colors hover:text-foreground"
								>
									Background Removal
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#capabilities"
									className="text-muted transition-colors hover:text-foreground"
								>
									Semantic Web Extractor
								</NextLink>
							</li>
						</ul>
					</div>

					{/* Column 2: Developers */}
					<div>
						<h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
							Developers
						</h3>
						<ul className="mt-4 space-y-2.5 text-xs">
							<li>
								<NextLink
									href="#playground"
									className="text-muted transition-colors hover:text-foreground"
								>
									Interactive Sandbox
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#code"
									className="text-muted transition-colors hover:text-foreground"
								>
									SDK & Code Examples
								</NextLink>
							</li>
							<li>
								<NextLink
									href="https://dash.itsrose.net"
									className="text-muted transition-colors hover:text-foreground"
								>
									Developer Console
								</NextLink>
							</li>
							<li>
								<NextLink
									href="https://github.com/xct007"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted transition-colors hover:text-foreground"
								>
									GitHub Repository
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#architecture"
									className="text-muted transition-colors hover:text-foreground"
								>
									Edge Latency Probes
								</NextLink>
							</li>
						</ul>
					</div>

					{/* Column 3: Legal & Platform */}
					<div>
						<h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
							Platform & Legal
						</h3>
						<ul className="mt-4 space-y-2.5 text-xs">
							<li>
								<NextLink
									href="/privacy-policy"
									className="text-muted transition-colors hover:text-foreground"
								>
									Privacy Policy
								</NextLink>
							</li>
							<li>
								<NextLink
									href="/terms"
									className="text-muted transition-colors hover:text-foreground"
								>
									Terms of Service
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#pricing"
									className="text-muted transition-colors hover:text-foreground"
								>
									Pricing & Credits
								</NextLink>
							</li>
							<li>
								<NextLink
									href="#faq"
									className="text-muted transition-colors hover:text-foreground"
								>
									Frequently Asked
								</NextLink>
							</li>
							<li>
								<NextLink
									href="https://dash.itsrose.net/support"
									className="text-muted transition-colors hover:text-foreground"
								>
									Help & Support
								</NextLink>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-12 flex flex-col items-center justify-between gap-4 border-border/80 border-t pt-8 text-xs sm:flex-row">
					<p className="text-muted">
						&copy; 2026 {config.appName}. All rights reserved.
					</p>

					<div className="flex items-center gap-4">
						<span className="text-muted">Theme</span>
						<ThemeSwitch />
					</div>
				</div>
			</div>
		</footer>
	);
}
