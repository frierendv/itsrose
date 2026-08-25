"use client";

import { CircleCheckFill } from "@gravity-ui/icons";
import { Card, Chip, Paragraph } from "@heroui/react";
import { cn, forwardRef } from "@itsrose/react/core";
import { PRODUCTS } from "./constants";
import { SubscribeButton } from "./subscribe-button";

export type PricingCardProps = {
	product: (typeof PRODUCTS)[number];
};

export const PricingCard = forwardRef<"div", PricingCardProps>((props, ref) => {
	const { as: Component = "div", product, ...otherProps } = props;
	return (
		<Card
			// className="relative w-fit"
			className={cn(
				"group relative flex",
				product.is_featured && [
					// "z-10",
					// "scale-105",
					"border-3 border-accent/20",
					"bg-linear-to-br from-accent/12 via-surface to-surface-secondary",
					"shadow-lg shadow-accent/10",
					"dark:border-accent/30 dark:from-accent/20 dark:via-surface dark:to-accent/8 dark:shadow-accent/5",
				]
			)}
			render={(cardProps) => <Component ref={ref} {...cardProps} />}
			{...otherProps}
		>
			<Card.Header>
				{product.is_featured && (
					<Chip
						className="absolute top-1 right-1 bg-accent-soft"
						aria-label="featured"
					>
						Most popular
					</Chip>
				)}
				<Card.Title className="flex font-bold text-2xl text-foreground gap-2">
					{product.title}
				</Card.Title>
				<Card.Description className="mt-2 mb-6">
					<span className="font-semibold text-3xl text-foreground">
						{product.price}{" "}
						{!product.is_free && !product.is_custom && "€"}
					</span>
					<span className="mx-2 text-foreground/70">•</span>
					<span className="text-foreground/70">
						{product.subtitle}
					</span>
				</Card.Description>
			</Card.Header>

			<Card.Content>
				{/* CTA Button */}
				<SubscribeButton
					{...(product.type === "link"
						? {
								onPress: () =>
									window.open(product.cta.href, "_blank"),
							}
						: {})}
					variant={!product.is_featured ? "outline" : "primary"}
					productId={product.id}
					fullWidth
				>
					{product.cta.value}
				</SubscribeButton>
				{/* Description */}
				<Paragraph className="my-6 grow text-foreground/70 text-sm leading-relaxed">
					{product.description}
				</Paragraph>
			</Card.Content>

			{/* What's Included */}
			<Card.Footer>
				<div className="flex h-full flex-col">
					<h4 className="font-medium text-foreground/70 text-xs uppercase tracking-wider">
						What&apos;s included:
					</h4>
					<ul className="mt-2 space-y-1">
						{product.features.map((item) => (
							<li
								className="flex items-center gap-3 text-foreground text-sm"
								key={item}
							>
								<div className="flex h-4 w-4 shrink-0 items-center justify-center">
									<CircleCheckFill />
								</div>
								{item}
							</li>
						))}
					</ul>
				</div>
			</Card.Footer>
		</Card>
	);
});
