const CTA_BUTTON_TEXT = "Get started";

type ProductCta =
	| {
			type: "text";
			value: string;
	  }
	| { type: "link"; value: string; href: string };
export const PRODUCTS = [
	{
		is_featured: false,
		is_free: true,
		is_custom: false,
		type: "monthly",
		id: "prod_5jMgo6OF6D1aor7kbMkAga",
		title: "Free Plan",
		subtitle: "Perfect for startups",
		price: "Free",
		cta: {
			type: "text",
			value: CTA_BUTTON_TEXT,
		} satisfies ProductCta,
		description:
			"Essential features for growing businesses. Get started with everything you need to launch your project.",
		features: [
			"Core Features",
			"10 Requests Per Minute (RPM)",
			"Community Support",
		],
	},
	{
		is_featured: true,
		is_free: false,
		is_custom: false,
		type: "monthly",
		id: "prod_zZYtP5N9NmdJtcPSGXBdY",
		title: "Pro Plan",
		subtitle: "Best for teams",
		price: "2.00",
		cta: {
			type: "text",
			value: CTA_BUTTON_TEXT,
		} satisfies ProductCta,
		description:
			"Advanced features for professional teams. Everything you need to scale your business with confidence.",
		features: [
			"Everything in Free Plan",
			"Up to 1K API Requests Per Minute (RPM)",
			"Priority Support",
		],
	},
	{
		is_featured: false,
		is_free: false,
		is_custom: true,
		type: "monthly",
		id: "prod_zZYtP5N9NmdJtcPSGXBdY",
		title: "Enterprise",
		subtitle: "Tailored",
		price: "Custom",
		cta: {
			type: "link",
			value: "Contact sales",
			href: "mailto:itsrose.dev@gmail.com",
		} satisfies ProductCta,
		description:
			"Custom solutions for large organizations. Get dedicated support and tailored features for your enterprise needs.",
		features: [
			"Everything in Pro",
			"Custom API Requests Per Minute (RPM)",
			"SLA & Support",
		],
	},
];
