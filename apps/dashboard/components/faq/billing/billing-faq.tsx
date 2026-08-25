"use client";

import {
	ChevronDown,
	CreditCard,
	FileText,
	Lock,
	ShieldCheck,
} from "@gravity-ui/icons";
import { Accordion, Card } from "@heroui/react";
import { memo } from "react";
import { FAQ_ITEMS } from "./billing-faq-data";

export const BillingFaq = memo(() => {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
			{/* Left Column: Security & Guarantee Callout */}
			<Card className="shadow-xs">
				<Card.Header className="pb-2">
					<Card.Title>
						<div className="flex items-center gap-3">
							<div className="text-success shrink-0">
								<ShieldCheck className="size-5" />
							</div>
							<div>
								<span className="text-base font-bold text-foreground">
									Secure Billing
								</span>
								<p className="text-xs text-muted">
									Bank-grade 256-bit encryption
								</p>
							</div>
						</div>
					</Card.Title>
					<Card.Description className="text-xs sm:text-sm text-muted leading-relaxed mt-3">
						All payments and subscriptions are processed securely by
						Creem in compliance with PCI-DSS Level 1 security
						standards. We never store your raw card credentials on
						our servers.
					</Card.Description>
				</Card.Header>

				<Card.Content className="py-2">
					<div className="space-y-2.5 text-xs text-foreground/90 pt-2 border-t border-border/40">
						<div className="flex items-center gap-2">
							<Lock
								width={14}
								height={14}
								className="text-accent shrink-0"
							/>
							<span>Encrypted checkout sessions</span>
						</div>
						<div className="flex items-center gap-2">
							<CreditCard
								width={14}
								height={14}
								className="text-accent shrink-0"
							/>
							<span>Worldwide payment methods supported</span>
						</div>
						<div className="flex items-center gap-2">
							<FileText
								width={14}
								height={14}
								className="text-accent shrink-0"
							/>
							<span>Instant downloadable VAT invoices</span>
						</div>
					</div>
				</Card.Content>

				<Card.Footer className="text-xs text-muted pt-3 border-t border-border/40">
					<span>
						Need custom enterprise invoicing?{" "}
						<a
							href="mailto:support@itsrose.net"
							className="text-accent hover:underline font-medium"
						>
							Contact support@itsrose.net
						</a>
					</span>
				</Card.Footer>
			</Card>

			{/* Right Column: FAQ Accordion */}
			<Card className="lg:col-span-2 shadow-xs">
				<Card.Header className="pb-2">
					<Card.Title className="text-base font-bold text-foreground">
						Frequently Asked Questions
					</Card.Title>
					<Card.Description className="text-xs text-muted mt-0.5">
						Everything you need to know about payments, invoicing,
						and subscription tiers.
					</Card.Description>
				</Card.Header>

				<Card.Content className="pt-2">
					<Accordion>
						{FAQ_ITEMS.map((item) => (
							<Accordion.Item
								key={item.id}
								id={item.id}
								className="py-1.5"
							>
								<Accordion.Heading>
									<Accordion.Trigger className="text-xs sm:text-sm font-medium text-foreground hover:text-accent transition-colors flex items-center justify-between w-full py-2 text-left">
										<span>{item.title}</span>
										<Accordion.Indicator>
											<ChevronDown className="size-4 text-muted shrink-0" />
										</Accordion.Indicator>
									</Accordion.Trigger>
								</Accordion.Heading>
								<Accordion.Panel>
									<Accordion.Body className="text-xs text-muted leading-relaxed pb-3 pt-1">
										{item.content}
									</Accordion.Body>
								</Accordion.Panel>
							</Accordion.Item>
						))}
					</Accordion>
				</Card.Content>
			</Card>
		</div>
	);
});

BillingFaq.displayName = "BillingFaq";
