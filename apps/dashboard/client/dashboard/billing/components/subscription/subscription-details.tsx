"use client";

import { Check, Copy } from "@gravity-ui/icons";
import { Button, Card, Tooltip } from "@heroui/react";
import type { SubscriptionData } from "@itsrose/auth/react";
import { memo, useCallback, useState } from "react";

export type SubscriptionDetailsProps = {
	subscription: SubscriptionData;
	className?: string;
};

export const SubscriptionDetails = memo<SubscriptionDetailsProps>(
	({ subscription, className }) => {
		const [isCopied, setIsCopied] = useState(false);

		const handleCopyId = useCallback(() => {
			if (!subscription?.id || typeof navigator === "undefined") {
				return;
			}
			navigator.clipboard.writeText(subscription.id);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}, [subscription?.id]);

		const customerEmail =
			typeof subscription.customer === "object" &&
			subscription.customer?.email
				? subscription.customer.email
				: "Account primary email";

		const collectionLabel =
			subscription.collectionMethod === "charge_automatically"
				? "Automatic Debit"
				: "Manual Invoicing";

		return (
			<div
				className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 ${
					className || ""
				}`}
			>
				{/* Subscription ID */}
				<Card>
					<Card.Header className="pb-1">
						<Card.Title className="text-[11px] font-semibold text-muted uppercase tracking-wider">
							Subscription ID
						</Card.Title>
					</Card.Header>
					<Card.Content className="pt-0">
						<div className="flex items-center justify-between gap-2">
							<span
								className="font-mono text-xs font-semibold text-foreground truncate"
								title={subscription.id}
							>
								{subscription.id || "N/A"}
							</span>
							{subscription.id && (
								<Tooltip delay={0}>
									<Tooltip.Trigger aria-label="Copy Subscription ID">
										<Button
											isIconOnly
											variant="ghost"
											size="sm"
											onPress={handleCopyId}
											aria-label="Copy subscription ID"
											className="h-7 w-7 min-w-7 shrink-0 text-muted hover:text-foreground"
										>
											{isCopied ? (
												<Check
													width={13}
													height={13}
													className="text-success"
												/>
											) : (
												<Copy width={13} height={13} />
											)}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content
										showArrow
										offset={6}
										placement="top"
									>
										<Tooltip.Arrow />
										<p className="text-xs">
											{isCopied
												? "Copied to clipboard!"
												: "Copy ID"}
										</p>
									</Tooltip.Content>
								</Tooltip>
							)}
						</div>
					</Card.Content>
				</Card>

				{/* Customer Email */}
				<Card>
					<Card.Header className="pb-1">
						<Card.Title className="text-[11px] font-semibold text-muted uppercase tracking-wider">
							Billing Customer
						</Card.Title>
					</Card.Header>
					<Card.Content className="pt-0">
						<span
							className="text-xs font-semibold text-foreground truncate block"
							title={customerEmail}
						>
							{customerEmail}
						</span>
					</Card.Content>
				</Card>

				{/* Collection Method */}
				<Card className="sm:col-span-2 lg:col-span-1">
					<Card.Header className="pb-1">
						<Card.Title className="text-[11px] font-semibold text-muted uppercase tracking-wider">
							Collection Method
						</Card.Title>
					</Card.Header>
					<Card.Content className="pt-0">
						<span className="text-xs font-semibold text-foreground">
							{collectionLabel}
						</span>
					</Card.Content>
				</Card>
			</div>
		);
	}
);

SubscriptionDetails.displayName = "SubscriptionDetails";
