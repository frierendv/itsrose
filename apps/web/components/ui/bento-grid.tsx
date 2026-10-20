"use client";

import { cn } from "@itsrose/react/core";
import React from "react";

export const BentoGrid = ({
	className,
	children,
}: {
	className?: string;
	children?: React.ReactNode;
}) => {
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
				className
			)}
		>
			{children}
		</div>
	);
};

export const BentoGridItem = ({
	className,
	title,
	description,
	header,
	icon,
	children,
}: {
	className?: string;
	title?: string | React.ReactNode;
	description?: string | React.ReactNode;
	header?: React.ReactNode;
	icon?: React.ReactNode;
	children?: React.ReactNode;
}) => {
	return (
		<div
			className={cn(
				"group relative flex flex-col justify-between overflow-hidden border border-border bg-surface p-6 transition-all duration-300 hover:border-accent/40 hover:shadow-lg",
				className
			)}
		>
			{header}
			<div className="flex flex-col gap-2 transition duration-200">
				{icon && <div className="text-accent">{icon}</div>}
				{title && (
					<div className="font-semibold text-foreground text-lg tracking-tight">
						{title}
					</div>
				)}
				{description && (
					<div className="text-muted text-sm leading-relaxed">
						{description}
					</div>
				)}
				{children}
			</div>
		</div>
	);
};
