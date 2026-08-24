"use client";

import { ArrowsRotateRight } from "@gravity-ui/icons";
import { Alert, Button, Card, Skeleton } from "@heroui/react";
import React, { memo } from "react";
import type { SubscriptionProps } from "../../types";
import { PortalButton } from "../portal-button";
import { BillingCycleMeter } from "./billing-cycle-meter";
import { StatusBadge } from "./status-badge";
import { SubscriptionDetails } from "./subscription-details";
import { SubscriptionEmpty } from "./subscription-empty";

export const SubscriptionCard = memo<SubscriptionProps>(
	({ subscription, isPending = false, error, onRefetch }) => {
		// Loading State
		if (isPending) {
			return <Skeleton className="h-72 w-full rounded-2xl" />;
		}

		// Error State with Retry Button
		if (error) {
			return (
				<Alert status="danger" className="w-full">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>
							Unable to retrieve subscription details
						</Alert.Title>
						<Alert.Description>
							We encountered an issue while communicating with the
							billing gateway. Please check your network
							connection or try refreshing.
						</Alert.Description>
					</Alert.Content>
					{onRefetch && (
						<Button
							size="sm"
							variant="outline"
							onPress={onRefetch}
							className="mt-2 sm:mt-0 shrink-0 gap-1.5"
						>
							<ArrowsRotateRight width={12} height={12} />
							<span>Try Again</span>
						</Button>
					)}
				</Alert>
			);
		}

		// Free Tier / No Active Subscription ID
		if (!subscription || !subscription.id) {
			return <SubscriptionEmpty />;
		}

		// Formatted Product Price & Billing Period
		const product =
			typeof subscription.product === "object"
				? subscription.product
				: null;

		const planName = product?.name || "Subscription Plan";

		const priceFormatted = product?.price
			? new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: product.currency || "USD",
				}).format(product.price / 100)
			: "Custom";

		const billingPeriod =
			product?.billingPeriod === "every-month"
				? "/ month"
				: product?.billingPeriod === "every-year"
					? "/ year"
					: "";

		return (
			<Card className="shadow-xs">
				{/* Plan Header */}
				<Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
					<div className="flex flex-wrap items-center gap-3">
						<h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
							{planName}
						</h3>
						<StatusBadge status={subscription.status} />
					</div>

					<div className="flex items-baseline gap-1">
						<span className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
							{priceFormatted}
						</span>
						<span className="text-sm font-medium text-muted">
							{billingPeriod}
						</span>
					</div>
				</Card.Header>

				<Card.Content className="space-y-4">
					{/* Cycle Progress Meter */}
					<BillingCycleMeter
						startDate={subscription.currentPeriodStartDate}
						endDate={subscription.currentPeriodEndDate}
					/>

					{/* Metadata details */}
					<SubscriptionDetails subscription={subscription} />
				</Card.Content>

				{/* Card Footer Actions */}
				<Card.Footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border/40">
					<div className="text-xs text-muted text-center sm:text-left">
						Need to update payment methods, cancel plan, or download
						VAT invoices? Use the Customer Portal.
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
						<PortalButton
							variant="primary"
							label="Manage in Portal"
							className="w-full sm:w-auto font-medium"
						/>
					</div>
				</Card.Footer>
			</Card>
		);
	}
);

SubscriptionCard.displayName = "SubscriptionCard";
