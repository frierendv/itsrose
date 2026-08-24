"use client";

import { useCreatePortal } from "@/hooks/use-creem";
import { ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { Button, Spinner, type ButtonRootProps } from "@heroui/react";
import { cn, forwardRef } from "@itsrose/react/core";
import React, { useCallback } from "react";

export type PortalButtonProps = Omit<ButtonRootProps, "children"> & {
	label?: React.ReactNode;
	children?: React.ReactNode;
	showIcon?: boolean;
};

export const PortalButton = forwardRef<"button", PortalButtonProps>(
	(props, ref) => {
		const {
			className,
			label = "Customer Portal",
			children,
			variant = "secondary",
			showIcon = true,
			...restProps
		} = props;
		const { mutate: createPortal, isPending } = useCreatePortal();

		const renderIcon = useCallback(() => {
			return isPending ? (
				<Spinner size="sm" />
			) : (
				showIcon && (
					<ArrowUpRightFromSquare
						width={14}
						height={14}
						className="shrink-0"
					/>
				)
			);
		}, [isPending, showIcon]);
		return (
			<Button
				ref={ref}
				aria-label="Open Creem Customer Portal"
				variant={variant}
				isPending={isPending}
				onPress={() => createPortal()}
				className={cn("w-full sm:w-auto", className)}
				{...restProps}
			>
				{renderIcon()}
				{children ?? label}
			</Button>
		);
	}
);

PortalButton.displayName = "PortalButton";
