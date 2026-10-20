"use client";

import { cn } from "@itsrose/react/core";
import React from "react";

type GridPatternProps = {
	width?: number;
	height?: number;
	x?: number;
	y?: number;
	squares?: Array<[x: number, y: number]>;
	strokeDasharray?: string;
	className?: string;
	[key: string]: any;
};

export function GridPattern({
	width = 36,
	height = 36,
	x = -1,
	y = -1,
	strokeDasharray = "4 4",
	squares,
	className,
	...props
}: GridPatternProps) {
	const id = React.useId();

	return (
		<svg
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 h-full w-full stroke-border/40 mask-[radial-gradient(ellipse_at_center,white,transparent_80%)]",
				className
			)}
			{...props}
		>
			<defs>
				<pattern
					id={id}
					width={width}
					height={height}
					patternUnits="userSpaceOnUse"
					x={x}
					y={y}
				>
					<path
						d={`M.5 ${height}V.5H${width}`}
						fill="none"
						strokeDasharray={strokeDasharray}
					/>
				</pattern>
			</defs>
			<rect
				width="100%"
				height="100%"
				strokeWidth={0}
				fill={`url(#${id})`}
			/>
			{squares && (
				<svg x={x} y={y} className="overflow-visible">
					{squares.map(([sqX, sqY], idx) => (
						<rect
							strokeWidth="0"
							key={`${sqX}-${sqY}-${idx}`}
							width={width - 1}
							height={height - 1}
							x={sqX * width + 1}
							y={sqY * height + 1}
							fill="var(--accent)"
							className="opacity-[0.06] transition-opacity duration-500 hover:opacity-20"
						/>
					))}
				</svg>
			)}
		</svg>
	);
}
