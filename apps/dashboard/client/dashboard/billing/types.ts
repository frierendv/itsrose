import type { SubscriptionData } from "@itsrose/auth/react";
import type React from "react";

export type BillingStatus =
	| "active"
	| "canceled"
	| "unpaid"
	| "paused"
	| "trialing"
	| "scheduled_cancel"
	| "free";

export type StatusConfig = {
	color: "success" | "warning" | "danger" | "accent" | "default";
	label: string;
	icon: React.ReactNode;
	description?: string;
};

export type SubscriptionProps = {
	subscription?: SubscriptionData | null;
	isPending?: boolean;
	error?: Error | null | unknown;
	onRefetch?: () => void;
};

export type StatCardProps = {
	title: string;
	icon: React.ElementType<React.SVGProps<SVGSVGElement>>;
	value: React.ReactNode;
	description?: React.ReactNode;
	badge?: React.ReactNode;
	isPending?: boolean;
	className?: string;
};

export type FaqItem = {
	id: string;
	title: string;
	content: string;
};

export type { SubscriptionData };
