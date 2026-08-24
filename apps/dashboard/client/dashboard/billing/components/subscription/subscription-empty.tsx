"use client";

import { Check } from "@gravity-ui/icons";
import { Button, Card, Chip } from "@heroui/react";
import { memo } from "react";

export type SubscriptionEmptyProps = {
	onUpgradeClick?: () => void;
	className?: string;
};

export const SubscriptionEmpty = memo<SubscriptionEmptyProps>(
	({ onUpgradeClick, className }) => {
		const handleScrollToPricing = () => {
			if (onUpgradeClick) {
				onUpgradeClick();
				return;
			}
			const pricingElement = document.getElementById("pricing-section");
			if (pricingElement) {
				pricingElement.scrollIntoView({ behavior: "smooth" });
			}
		};

		return (
			<Card
				className={`overflow-hidden border-dashed border-border/80 ${className || ""}`}
			>
				<Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
					{/* <div className="flex flex-wrap items-center">
						<h3 className="text-xl font-bold text-foreground">
							Free Starter Plan
						</h3>
						<p className="text-xs text-muted mt-0.5">
							You are currently using the free standard tier.
						</p>
					</div> */}
					<div className="flex flex-wrap items-start md:flex-col">
						<Card.Title className="text-xl font-bold text-foreground">
							Free Starter Plan
						</Card.Title>
						<Card.Description className="text-xs text-muted mt-0.5">
							You are currently using the free standard tier.
						</Card.Description>
					</div>

					<div className="flex items-center gap-2">
						<Chip
							variant="soft"
							color="default"
							className="text-xs font-medium"
						>
							Free Tier
						</Chip>
						<span className="text-xl sm:text-2xl font-extrabold text-foreground">
							€0.00
							<span className="text-xs font-normal text-muted ml-1">
								/ month
							</span>
						</span>
					</div>
				</Card.Header>

				<Card.Content className="py-2">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/5 border border-border/40 text-xs">
						<div className="flex items-center gap-2 text-foreground/90">
							<Check
								width={14}
								height={14}
								className="text-success shrink-0"
							/>
							<span>Standard API access</span>
						</div>
						<div className="flex items-center gap-2 text-foreground/90">
							<Check
								width={14}
								height={14}
								className="text-success shrink-0"
							/>
							<span>Community support</span>
						</div>
						<div className="flex items-center gap-2 text-foreground/90">
							<Check
								width={14}
								height={14}
								className="text-success shrink-0"
							/>
							<span>Unlimited dashboard analytics</span>
						</div>
					</div>
				</Card.Content>

				<Card.Footer className="self-end">
					<Button
						variant="primary"
						size="sm"
						onPress={handleScrollToPricing}
						className="font-medium"
					>
						View Paid Plans
					</Button>
				</Card.Footer>
			</Card>
		);
	}
);

SubscriptionEmpty.displayName = "SubscriptionEmpty";
