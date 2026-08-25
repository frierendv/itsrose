"use client";

import { FlowerOutline } from "@/components/common";
import { BaseLayout, MainLayout } from "@/components/layout";
import { ThemeSwitchBase } from "@/components/theme-switch/theme-switch-base";
import { Navbar } from "@/components/ui/navbar";
import { config } from "@/shared/config";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { buttonVariants, Chip, Link, Separator } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { memo, type PropsWithChildren } from "react";

export const PublicLayout = memo<PropsWithChildren>(({ children }) => (
	<BaseLayout>
		<Navbar position="sticky" maxWidth="lg">
			<Navbar.Content>
				<Navbar.MenuToggle className="sm:hidden" />
				<Navbar.Brand>
					<Link
						href="/"
						className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
					>
						<FlowerOutline size={30} />
						<span className="font-bold text-xl tracking-tight">
							{config.APP_NAME}
						</span>
					</Link>
				</Navbar.Brand>
			</Navbar.Content>

			<Navbar.Content className="hidden md:flex gap-6">
				<Navbar.Item>
					<Link
						href="#features"
						className="text-sm font-medium text-muted hover:text-foreground transition-colors"
					>
						Features
					</Link>
				</Navbar.Item>
				<Navbar.Item>
					<Link
						href="#pricing"
						className="text-sm font-medium text-muted hover:text-foreground transition-colors"
					>
						Pricing
					</Link>
				</Navbar.Item>
				<Navbar.Item>
					<Link
						href="#faq"
						className="text-sm font-medium text-muted hover:text-foreground transition-colors"
					>
						FAQ
					</Link>
				</Navbar.Item>
				<Navbar.Item>
					<Link
						href="/resource/api-reference"
						target="_blank"
						className="text-sm font-medium text-muted hover:text-foreground transition-colors flex items-center gap-1"
					>
						Docs
						<Link.Icon>
							<ArrowUpRightFromSquare className="size-3" />
						</Link.Icon>
					</Link>
				</Navbar.Item>
			</Navbar.Content>

			<Navbar.Content justify="end" className="gap-2">
				<Navbar.Item className="hidden sm:flex">
					<ThemeSwitchBase size="sm" variant="ghost" />
				</Navbar.Item>
				<Navbar.Item>
					<Link
						href="/sign-in"
						className={cn(
							"text-xs font-medium",
							buttonVariants({ variant: "outline", size: "sm" })
						)}
					>
						Login
					</Link>
				</Navbar.Item>
			</Navbar.Content>

			<Navbar.Menu className="bg-background/95 backdrop-blur-md">
				<Navbar.MenuItem>
					<Link
						href="#features"
						className="text-base text-foreground font-medium py-1.5"
					>
						Features
					</Link>
				</Navbar.MenuItem>
				<Navbar.MenuItem>
					<Link
						href="#pricing"
						className="text-base text-foreground font-medium py-1.5"
					>
						Pricing
					</Link>
				</Navbar.MenuItem>
				<Navbar.MenuItem>
					<Link
						href="#faq"
						className="text-base text-foreground font-medium py-1.5"
					>
						FAQ
					</Link>
				</Navbar.MenuItem>
				<Navbar.MenuItem>
					<Link
						href="/resource/api-reference"
						target="_blank"
						className="text-base text-foreground font-medium py-1.5 flex items-center gap-1.5"
					>
						API Reference
						<Link.Icon>
							<ArrowUpRightFromSquare className="size-3.5" />
						</Link.Icon>
					</Link>
				</Navbar.MenuItem>
			</Navbar.Menu>
		</Navbar>

		<MainLayout className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			{children}
		</MainLayout>

		{/* Rich Public Footer */}
		<footer className="w-full border-t border-border/60 bg-surface mt-20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12">
					{/* Brand Column */}
					<div className="md:col-span-2 space-y-4">
						<Link
							href="/"
							className="flex items-center gap-2.5 text-foreground"
						>
							<FlowerOutline size={28} />
							<span className="font-bold text-xl tracking-tight">
								{config.APP_NAME}
							</span>
						</Link>
						<p className="text-sm text-muted max-w-sm leading-relaxed">
							{config.APP_DESCRIPTION} Unified AI vision, neural
							voice, character agents, and high-performance media
							extraction APIs.
						</p>
						<div className="flex items-center gap-3 pt-1">
							<Chip
								variant="soft"
								className="bg-surface-secondary text-muted text-xs border border-border/50"
							>
								v2.0 Stable
							</Chip>
							<span className="text-xs text-muted">
								Global Edge Distributed
							</span>
						</div>
					</div>

					{/* Products Column */}
					<div className="space-y-3">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
							Products
						</h4>
						<ul className="space-y-2 text-sm text-muted">
							<li>
								<Link
									href="#features"
									className="text-muted hover:text-foreground transition-colors"
								>
									AI Vision Studio
								</Link>
							</li>
							<li>
								<Link
									href="#features"
									className="text-muted hover:text-foreground transition-colors"
								>
									Neural Voice AI
								</Link>
							</li>
							<li>
								<Link
									href="#features"
									className="text-muted hover:text-foreground transition-colors"
								>
									Character Personas
								</Link>
							</li>
							<li>
								<Link
									href="#features"
									className="text-muted hover:text-foreground transition-colors"
								>
									Social Extractors
								</Link>
							</li>
							<li>
								<Link
									href="#pricing"
									className="text-muted hover:text-foreground transition-colors"
								>
									Pricing Plans
								</Link>
							</li>
						</ul>
					</div>

					{/* Developers Column */}
					<div className="space-y-3">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
							Developers
						</h4>
						<ul className="space-y-2 text-sm text-muted">
							<li>
								<Link
									href="/resource/api-reference"
									target="_blank"
									className="text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
								>
									<span>API Reference</span>
									<ArrowUpRightFromSquare className="size-3" />
								</Link>
							</li>
							<li>
								<Link
									href="/dashboard"
									className="text-muted hover:text-foreground transition-colors"
								>
									API Keys &amp; Quotas
								</Link>
							</li>
							<li>
								<Link
									href="#faq"
									className="text-muted hover:text-foreground transition-colors"
								>
									Platform FAQ
								</Link>
							</li>
						</ul>
					</div>

					{/* Legal & Social Column */}
					<div className="space-y-3">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
							Legal &amp; Links
						</h4>
						<ul className="space-y-2 text-sm text-muted">
							<li>
								<Link
									href="/terms"
									className="text-muted hover:text-foreground transition-colors"
								>
									Terms of Service
								</Link>
							</li>
							<li>
								<Link
									href="/privacy-policy"
									className="text-muted hover:text-foreground transition-colors"
								>
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link
									href={
										config.authors.github.url ||
										"https://github.com/itsrose"
									}
									target="_blank"
									className="text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
								>
									<span>GitHub</span>
									<ArrowUpRightFromSquare className="size-3" />
								</Link>
							</li>
							<li>
								<Link
									href="mailto:support@itsrose.net"
									className="text-muted hover:text-foreground transition-colors"
								>
									Contact Support
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<Separator className="my-8" />

				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
					<p>
						&copy; {new Date().getFullYear()} {config.APP_TITLE}.
						All rights reserved.
					</p>
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1.5">
							<span className="size-2 bg-success block" />
							<span>All Systems Operational</span>
						</span>
						<ThemeSwitchBase size="sm" variant="ghost" />
					</div>
				</div>
			</div>
		</footer>
	</BaseLayout>
));

PublicLayout.displayName = "PublicLayout";
