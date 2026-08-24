"use client";

import {
	Calendar,
	CircleFill,
	Clock,
	CreditCard,
	Diamond,
	ShieldCheck,
} from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { differenceInCalendarDays, format } from "date-fns";
import { memo, useMemo } from "react";
import type { SubscriptionProps } from "../../types";
import { StatCard } from "./stat-card";

export const SubscriptionOverview = memo<SubscriptionProps>(
	({ subscription, isPending = false }) => {
		const hasActiveSub = Boolean(subscription && subscription.id);

		// Plan Info
		const { planName, planStatus, planBadgeColor } = useMemo(() => {
			if (!hasActiveSub || !subscription) {
				return {
					planName: "Free Tier",
					planStatus: "Free",
					planBadgeColor: "default" as const,
				};
			}

			const product =
				typeof subscription.product === "object"
					? subscription.product
					: null;
			const name = product?.name || "Subscription Plan";
			const status = subscription.status || "active";

			const colorMap: Record<
				string,
				"success" | "warning" | "danger" | "accent" | "default"
			> = {
				active: "success",
				trialing: "accent",
				scheduled_cancel: "warning",
				canceled: "warning",
				unpaid: "danger",
			};

			return {
				planName: name,
				planStatus: status.replace("_", " "),
				planBadgeColor: colorMap[status] || "default",
			};
		}, [hasActiveSub, subscription]);

		// Billing Cycle / Renewal Info
		const { cycleTitle, cycleValue, cycleDesc } = useMemo(() => {
			if (!hasActiveSub || !subscription?.currentPeriodEndDate) {
				return {
					cycleTitle: "Billing Cycle",
					cycleValue: "No Active Renewal",
					cycleDesc: "Free tier active",
				};
			}

			const endDate = new Date(subscription.currentPeriodEndDate);
			const isCanceled =
				subscription.status === "canceled" ||
				subscription.status === "scheduled_cancel";
			const title = isCanceled ? "Access Ends" : "Next Renewal";
			const dateFormatted = format(endDate, "MMM d, yyyy");
			const daysLeft = differenceInCalendarDays(endDate, new Date());

			return {
				cycleTitle: title,
				cycleValue: dateFormatted,
				cycleDesc:
					daysLeft >= 0 ? `${daysLeft} days remaining` : "Expired",
			};
		}, [hasActiveSub, subscription]);

		// Payment Method Info
		const { paymentMethod, paymentDesc } = useMemo(() => {
			if (!hasActiveSub || !subscription) {
				return {
					paymentMethod: "None",
					paymentDesc: "No card on file",
				};
			}

			const isAuto =
				subscription.collectionMethod === "charge_automatically";
			return {
				paymentMethod: isAuto ? "Auto-Debit" : "Manual Invoice",
				paymentDesc: "Managed via Creem",
			};
		}, [hasActiveSub, subscription]);

		// Customer Account Info
		const { customerEmail, customerDesc } = useMemo(() => {
			if (!hasActiveSub || !subscription?.customer) {
				return {
					customerEmail: "Account Profile",
					customerDesc: "Personal account",
				};
			}

			const email =
				typeof subscription.customer === "object"
					? subscription.customer.email
					: "Linked Customer";

			return {
				customerEmail: email,
				customerDesc: "Verified Customer",
			};
		}, [hasActiveSub, subscription]);

		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
				{/* Current Plan */}
				<StatCard
					title="Current Plan"
					icon={Diamond}
					value={planName}
					isPending={isPending}
					badge={
						<Chip
							variant="soft"
							color={planBadgeColor}
							size="sm"
							className="gap-1 capitalize text-[11px] font-medium"
						>
							<CircleFill width={6} height={6} />
							<span>{planStatus}</span>
						</Chip>
					}
				/>

				{/* Renewal / Expiry */}
				<StatCard
					title={cycleTitle}
					icon={Calendar}
					value={cycleValue}
					isPending={isPending}
					description={
						<span className="flex items-center gap-1">
							<Clock
								width={12}
								height={12}
								className="shrink-0"
							/>
							{cycleDesc}
						</span>
					}
				/>

				{/* Payment Method */}
				<StatCard
					title="Payment Method"
					icon={CreditCard}
					value={paymentMethod}
					isPending={isPending}
					description={paymentDesc}
				/>

				{/* Customer Account */}
				<StatCard
					title="Billing Account"
					icon={ShieldCheck}
					value={customerEmail}
					isPending={isPending}
					description={customerDesc}
				/>
			</div>
		);
	}
);

SubscriptionOverview.displayName = "SubscriptionOverview";
