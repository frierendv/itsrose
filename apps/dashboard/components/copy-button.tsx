"use client";

import CopyIcon from "@gravity-ui/icons/Copy";
import CopyCheck from "@gravity-ui/icons/CopyCheck";
import { toast } from "@heroui/react";
import { Button, type ButtonRootProps } from "@heroui/react/button";
import { cn, forwardRef, type RightJoinProps } from "@itsrose/react/core";
import { useClipboard } from "@itsrose/react/hooks/use-clipboard";
import { useMemo } from "react";

export type CopyButtonProps = RightJoinProps<
	ButtonRootProps,
	{
		/** Text to copy @default "" */
		textValue?: string;
		children?: React.ReactNode;
	}
>;
export const CopyButton = forwardRef<"button", CopyButtonProps>(
	(props, ref) => {
		const { textValue = "", className, children, ...restProps } = props;

		const clipboard = useClipboard({
			onSuccess: () => toast.success("Copied to clipboard"),
		});

		const Icon = useMemo(
			() => (clipboard.copied ? CopyCheck : CopyIcon),
			[clipboard.copied]
		);

		return (
			<Button
				ref={ref}
				isIconOnly={!children}
				onPress={() => clipboard.copy(textValue)}
				variant="outline"
				size="sm"
				className={cn({ "text-success": clipboard.copied }, className)}
				{...restProps}
			>
				<Icon
					aria-hidden
					className={cn({ "text-success": clipboard.copied })}
				/>
				{(children && clipboard.copied && "Copied") || children}
			</Button>
		);
	}
);
CopyButton.displayName = "CopyButton";
