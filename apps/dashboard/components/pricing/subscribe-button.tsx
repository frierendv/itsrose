"use client";

import { authClient } from "@/shared/client";
import { useRouter } from "@bprogress/next";
import { toast } from "@heroui/react";
import { Button, type ButtonProps } from "@heroui/react/button";
import { forwardRef } from "@itsrose/react/core";
import { useCallback, useState } from "react";

export type SubscribeButtonProps = ButtonProps & {
	productId: string;
	discountCode?: string;
	successUrl?: string;
};

export const SubscribeButton = forwardRef<"button", SubscribeButtonProps>(
	(props, ref) => {
		const {
			// product related prop
			productId,
			discountCode,
			successUrl = "/dashboard",

			// react prop
			as: Component = "button",
			className,
			...otherProps
		} = props;
		const route = useRouter();
		const [isPending, setPending] = useState<boolean>(false);
		const handleSubscribe = useCallback(async () => {
			setPending(true);
			const loadingId = toast("Processing payment...", {
				isLoading: true,
				timeout: 0,
			});

			// const { data, error } = await new Promise((resolve) =>
			// 	setTimeout(() => {
			// 		resolve({ data: { url: "" }, error: {} });
			// 	}, 5_000)
			// );

			const { data, error } = await authClient.creem.createCheckout({
				productId,
				discountCode,
				successUrl,
			});
			toast.close(loadingId);
			setPending(false);
			if (error || !data?.url) {
				return toast.danger("Failed");
			}
			route.push(data.url);
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [productId, discountCode, successUrl]);

		return (
			<Button
				variant="primary"
				isPending={isPending}
				onPress={handleSubscribe}
				render={(buttonProps) => (
					<Component ref={ref} {...buttonProps} />
				)}
				{...otherProps}
			/>
		);
	}
);
