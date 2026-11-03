"use client";

import { Envelope, ShieldCheck } from "@gravity-ui/icons";
import { Accordion, Card, Typography } from "@heroui/react";
import Link from "next/link";
import type {
	BillingFaqItem as FaqItem,
	BillingKeyPoint as KeyPoint,
} from "../types";
import { FaqContentBlock } from "./faq-content-block";

const BillingKeyPoint: React.FC<{ items: KeyPoint[] }> = ({ items }) => (
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
					Zero foreign conversion markups. Settle invoices seamlessly
					in IDR via national standard QRIS, major bank Virtual
					Accounts, or direct e-Wallets.
				</Card.Description>
			</Card.Header>

			<Card.Content className="py-3 flex flex-col gap-3.5">
				{items.map(({ icon: Icon, ...point }) => (
					<div
						key={point.title}
						className="flex items-start gap-2.5 text-xs text-foreground"
					>
						{Icon && (
							<Icon className="size-4 shrink-0" aria-hidden />
						)}
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
					Need official tax invoices (Faktur Pajak) or corporate POs?
					Contact{" "}
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
);
BillingKeyPoint.displayName = "BillingKeyPoint";

export type BillingFaqProps = {
	fagItems: FaqItem[];
	KeyPoints: KeyPoint[];
};
export const BillingFaq: React.FC<BillingFaqProps> = ({
	fagItems = [],
	KeyPoints = [],
}) => {
	return (
		<div className="flex flex-col gap-6 w-full">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
				{/* Rails & Rates Panels */}
				<BillingKeyPoint items={KeyPoints} />
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
						<Accordion allowsMultipleExpanded>
							{fagItems.map((item) => (
								<Accordion.Item key={item.id} id={item.id}>
									<Accordion.Heading>
										<Accordion.Trigger>
											<Typography type="body-sm">
												{item.title}
											</Typography>
											<Accordion.Indicator />
										</Accordion.Trigger>
									</Accordion.Heading>
									<Accordion.Panel>
										<Accordion.Body>
											<FaqContentBlock
												content={item.content}
											/>
										</Accordion.Body>
									</Accordion.Panel>
								</Accordion.Item>
							))}
						</Accordion>
					</Card.Content>
				</Card>
			</div>
		</div>
	);
};

BillingFaq.displayName = "BillingFaq";
