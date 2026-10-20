"use client";

import {
	ArrowUpRight,
	ChevronDown,
	CircleQuestion,
	Clock,
	CreditCard,
	Envelope,
	QrCode,
	ShieldCheck,
} from "@gravity-ui/icons";
import { Accordion, Card, Chip } from "@heroui/react";
import Link from "next/link";
import { memo, useCallback } from "react";
import {
	BILLING_KEY_POINTS,
	FAQ_ITEMS,
	type BillingFaqItem,
	type BillingKeyPoint,
} from "./billing-faq-data";
import { BillingFaqAccordion } from "./faq-accordion";
import { FaqContentBlock } from "./faq-content-block";

export const BillingFaqList = () => {
	const renderFaqIcon = useCallback(
		(iconName: BillingFaqItem["iconName"]) => {
			switch (iconName) {
				case "QrCode":
					return <QrCode className="size-4 shrink-0 text-accent" />;
				case "Clock":
					return <Clock className="size-4 shrink-0 text-warning" />;
				case "ArrowUpRight":
					return (
						<ArrowUpRight className="size-4 shrink-0 text-success" />
					);
				case "SlidersVertical":
				case "ArrowsRotateLeft":
				case "Receipt":
				case "CreditCard":
					return (
						<CreditCard className="size-4 shrink-0 text-accent" />
					);
				case "ShieldCheck":
					return (
						<ShieldCheck className="size-4 shrink-0 text-success" />
					);
				default:
					return (
						<CircleQuestion className="size-4 shrink-0 text-muted" />
					);
			}
		},
		[]
	);
	return (
		<Accordion
			variant="default"
			allowsMultipleExpanded
			defaultExpandedKeys={["payment-methods", "mid-cycle-upgrades"]}
		>
			{FAQ_ITEMS.map((item) => (
				<Accordion.Item key={item.id} id={item.id} className="py-1">
					<Accordion.Heading>
						<Accordion.Trigger className="text-xs sm:text-sm font-medium text-foreground hover:text-accent transition-colors flex items-center justify-between w-full py-3.5 px-2 text-left gap-3">
							<div className="flex items-center gap-3 min-w-0">
								<div className="shrink-0">
									{renderFaqIcon(item.iconName)}
								</div>
								<div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 min-w-0">
									<span className="font-semibold text-foreground text-xs sm:text-sm">
										{item.title}
									</span>
									<Chip
										color="default"
										size="sm"
										variant="soft"
										className="shrink-0"
									>
										{item.badge}
									</Chip>
								</div>
							</div>
							<Accordion.Indicator>
								<ChevronDown className="size-4 text-muted shrink-0" />
							</Accordion.Indicator>
						</Accordion.Trigger>
					</Accordion.Heading>
					<Accordion.Panel>
						<Accordion.Body className="text-xs sm:text-sm text-muted leading-relaxed pb-4 pt-1 pl-9 pr-2">
							<FaqContentBlock content={item.content} />
						</Accordion.Body>
					</Accordion.Panel>
				</Accordion.Item>
			))}
		</Accordion>
	);
};

export const BillingFaq = memo(() => {
	const renderKeyPointIcon = useCallback(
		(iconName: BillingKeyPoint["iconName"]) => {
			switch (iconName) {
				case "QrCode":
					return <QrCode />;
				case "CreditCard":
					return <CreditCard />;
				case "Clock":
					return <Clock />;
				case "ShieldCheck":
					return <ShieldCheck />;
				default:
					return <ShieldCheck />;
			}
		},
		[]
	);

	return (
		<div className="flex flex-col gap-6 w-full">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				{/* FAQ Accordion */}
				<Card variant="default" className="lg:col-span-2">
					<Card.Header className="pb-3 border-b border-border">
						<Card.Title className="text-base font-bold text-foreground">
							Billing & Subscriptions FAQ
						</Card.Title>
						<Card.Description className="text-xs text-muted mt-0.5">
							Everything you need to know about payments,
							proration, and cycle renewals.
						</Card.Description>
					</Card.Header>

					<Card.Content>
						<BillingFaqAccordion />
					</Card.Content>
				</Card>

				{/* Rails & Rates Panels */}
				<div className="flex flex-col gap-4">
					<Card variant="default">
						<Card.Header className="pb-3 border-b border-border">
							<Card.Title>
								<div className="flex items-center gap-2.5">
									<div className="text-success shrink-0">
										<ShieldCheck className="size-5" />
									</div>
									<div>
										<span className="text-base font-bold text-foreground">
											Native Indonesian Rails
										</span>
										<p className="text-xs text-muted">
											Instant Push Settlement
										</p>
									</div>
								</div>
							</Card.Title>
							<Card.Description className="text-xs sm:text-sm text-muted leading-relaxed mt-2.5">
								Zero foreign conversion markups. Settle invoices
								seamlessly in IDR via national standard QRIS,
								major bank Virtual Accounts, or direct
								e-Wallets.
							</Card.Description>
						</Card.Header>

						<Card.Content className="py-3 flex flex-col gap-3.5">
							{BILLING_KEY_POINTS.map((point) => (
								<div
									key={point.title}
									className="flex items-start gap-2.5 text-xs text-foreground"
								>
									<span className="size-4 shrink-0">
										{renderKeyPointIcon(point.iconName)}
									</span>
									<div className="flex flex-col gap-0.5">
										<span className="font-semibold text-foreground">
											{point.title}
										</span>
										<span className="text-muted leading-relaxed">
											{point.description}
										</span>
									</div>
								</div>
							))}
						</Card.Content>

						<Card.Footer className="text-xs text-muted pt-3 flex flex-col gap-1 border-t border-border">
							<div className="flex items-center gap-1.5 font-medium text-foreground">
								<Envelope className="size-3.5 text-accent shrink-0" />
								<span>Custom Enterprise Invoicing</span>
							</div>
							<p className="text-xs text-muted leading-relaxed">
								Need official tax invoices (Faktur Pajak) or
								corporate POs? Contact{" "}
								<Link
									href="mailto:support@itsrose.net"
									target="_blank"
									className="text-accent hover:underline font-medium"
								>
									support@itsrose.net
								</Link>
							</p>
						</Card.Footer>
					</Card>
				</div>
			</div>
		</div>
	);
});

BillingFaq.displayName = "BillingFaq";
