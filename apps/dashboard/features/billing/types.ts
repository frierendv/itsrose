export interface BillingFaqItem {
	id: string;
	title: string;
	content: string;
	badge: string;
	summary: string;
}

export interface BillingKeyPoint {
	title: string;
	description: string;
	icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}
