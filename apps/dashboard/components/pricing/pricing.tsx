"use client";

import { BUSINESS_PLAN, HOBBY_PLAN, PRO_PLAN } from "@itsrose/auth/product";
import { memo } from "react";
import { Content } from "../common";
import { PricingCard } from "./pricing-card";

export const Pricing = memo(() => {
	return (
		<Content className="grid grid-cols-1 md:grid-cols-3">
			{[HOBBY_PLAN, PRO_PLAN, BUSINESS_PLAN].map((product, index) => (
				<PricingCard key={index} product={product} />
			))}
		</Content>
	);
});
