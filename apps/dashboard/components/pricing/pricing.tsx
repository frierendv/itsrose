"use client";

import { memo } from "react";
import { Content } from "../common";
import { PRODUCTS } from "./constants";
import { PricingCard } from "./pricing-card";

export const Pricing = memo(() => {
	return (
		<Content className="grid grid-cols-1 md:grid-cols-3">
			{PRODUCTS.map((product, index) => (
				<PricingCard key={index} product={product} />
			))}
		</Content>
	);
});
