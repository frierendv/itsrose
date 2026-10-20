import {
	Link,
	Separator,
	Typography,
	type LinkRootProps,
	type ParagraphProps,
	type TypographyProps,
} from "@heroui/react";
import { cn, type HTMLProps } from "@itsrose/react/core";
import type { MDXComponents } from "mdx/types";

const heading =
	<T extends TypographyProps["type"]>(
		headingType: T,
		baseProps?: Omit<TypographyProps, "type" | "children">
	) =>
	({ className, children, ...props }: Omit<TypographyProps, "type">) => {
		return (
			<Typography
				type={headingType}
				{...baseProps}
				{...props}
				className={cn(baseProps?.className, className)}
			>
				{children}
			</Typography>
		);
	};

const components: MDXComponents = {
	wrapper: ({ children }: HTMLProps<"div">) => (
		<div className="mx-auto w-full max-w-4xl px-4 sm:px-6 flex flex-col gap-5">
			{children}
		</div>
	),
	h1: heading("h1", {
		className:
			"text-3xl sm:text-4xl font-bold tracking-tight text-foreground mt-2 mb-1 scroll-mt-24",
	}),
	h2: heading("h2", {
		className:
			"text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-8 mb-2 pb-2 border-b border-border/60 scroll-mt-24",
	}),
	h3: heading("h3", {
		className:
			"text-lg sm:text-xl font-semibold text-foreground mt-6 mb-2 scroll-mt-24",
	}),
	h4: heading("h4", {
		className:
			"text-base sm:text-lg font-medium text-foreground mt-4 mb-1.5 scroll-mt-24",
	}),
	h5: heading("h5", { className: "scroll-mt-24" }),
	h6: heading("h6", { className: "scroll-mt-24" }),
	p: (props: ParagraphProps) => (
		<Typography.Paragraph
			className="text-sm sm:text-base leading-relaxed text-foreground/90 my-1"
			{...props}
		/>
	),
	a: ({ className, ...props }: LinkRootProps) => (
		<Link
			className={cn(
				"text-accent hover:text-accent-hover font-medium",
				className
			)}
			{...props}
		/>
	),
	ul: (props: HTMLProps<"ul">) => (
		<ul
			className="list-disc pl-6 space-y-1.5 text-sm sm:text-base text-foreground/90"
			{...props}
		/>
	),
	ol: (props: HTMLProps<"ol">) => (
		<ol
			className="list-decimal pl-6 space-y-1.5 text-sm sm:text-base text-foreground/90"
			{...props}
		/>
	),
	li: (props: HTMLProps<"li">) => (
		<li className="leading-relaxed pl-1" {...props} />
	),
	blockquote: (props: HTMLProps<"blockquote">) => (
		<blockquote
			className="border-l-4 border-accent/70 bg-surface-secondary/60 rounded-r-lg px-4 text-foreground/85 italic text-sm sm:text-base"
			{...props}
		/>
	),
	hr: () => <Separator className="my-6 border-border/80" />,
	strong: (props: HTMLProps<"strong">) => (
		<strong className="font-semibold text-foreground" {...props} />
	),
	table: (props: HTMLProps<"table">) => (
		<div className="my-4 w-full overflow-x-auto rounded-lg border border-border">
			<table className="w-full text-left text-sm" {...props} />
		</div>
	),
	thead: (props: HTMLProps<"thead">) => (
		<thead
			className="bg-surface-secondary border-b border-border text-foreground font-semibold"
			{...props}
		/>
	),
	tbody: (props: HTMLProps<"tbody">) => (
		<tbody className="divide-y border-border/60" {...props} />
	),
	tr: (props: HTMLProps<"tr">) => (
		<tr
			className="transition-colors hover:bg-surface-secondary/40"
			{...props}
		/>
	),
	th: (props: HTMLProps<"th">) => (
		<th
			className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
			{...props}
		/>
	),
	td: (props: HTMLProps<"td">) => (
		<td className="px-4 py-3 text-foreground/90" {...props} />
	),
	code: (props: HTMLProps<"code">) => (
		<code
			className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-xs text-accent font-medium"
			{...props}
		/>
	),
};

export const useMDXComponents = (): MDXComponents => {
	return components;
};
