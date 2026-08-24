"use client";

import {
	CircleCheck,
	CircleInfo,
	TriangleExclamation,
} from "@gravity-ui/icons";
import { Chip, Tooltip } from "@heroui/react";
import React, { memo, useMemo } from "react";
import type { StatusConfig } from "../../types";

export type StatusBadgeProps = {
	status?: string | null;
	customTooltip?: string;
	className?: string;
};

export const StatusBadge = memo<StatusBadgeProps>(
	({ status = "free", customTooltip, className }) => {
		const config: StatusConfig = useMemo(() => {
			const iconProps = { width: 14, height: 14 } as const;
			switch (status) {
				case "active":
					return {
						color: "success",
						label: "Active",
						icon: <CircleCheck {...iconProps} />,
						description:
							"Your subscription is active with full access.",
					};
				case "trialing":
					return {
						color: "accent",
						label: "Trial Period",
						icon: <CircleInfo {...iconProps} />,
						description: "You are currently in a trial period.",
					};
				case "scheduled_cancel":
					return {
						color: "warning",
						label: "Canceling",
						icon: <TriangleExclamation {...iconProps} />,
						description:
							"Subscription will end at the end of the billing period.",
					};
				case "canceled":
					return {
						color: "warning",
						label: "Canceled",
						icon: <TriangleExclamation {...iconProps} />,
						description: "Your subscription has been canceled.",
					};
				case "unpaid":
					return {
						color: "danger",
						label: "Payment Past Due",
						icon: <TriangleExclamation {...iconProps} />,
						description:
							"A recurring payment failed. Please update your payment details.",
					};
				case "paused":
					return {
						color: "warning",
						label: "Paused",
						icon: <CircleInfo {...iconProps} />,
						description: "Subscription is temporarily paused.",
					};
				case "free":
				default:
					return {
						color: "default",
						label:
							status === "free"
								? "Free Tier"
								: status || "Unknown",
						icon: <CircleInfo {...iconProps} />,
						description:
							"Standard free access without recurring billing.",
					};
			}
		}, [status]);

		return (
			<Tooltip delay={0}>
				<Tooltip.Trigger
					aria-label={`Subscription status: ${config.label}`}
				>
					<Chip
						variant="soft"
						color={config.color}
						className={`gap-1.5 font-medium cursor-help ${className || ""}`}
					>
						{config.icon}
						<span>{config.label}</span>
					</Chip>
				</Tooltip.Trigger>
				<Tooltip.Content showArrow offset={8} placement="top">
					<Tooltip.Arrow />
					<p className="text-xs">
						{customTooltip || config.description}
					</p>
				</Tooltip.Content>
			</Tooltip>
		);
	}
);

StatusBadge.displayName = "StatusBadge";
