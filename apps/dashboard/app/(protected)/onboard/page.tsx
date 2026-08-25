"use client";

import { Content } from "@/components/common";
import { FlowerLoader } from "@/components/loader";
import { Pricing } from "@/components/pricing";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { authClient } from "@/shared/client";
import { useSession } from "@better-auth-ui/react";
import { Button, toast, Typography } from "@heroui/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

const loadingStates = [
	{
		text: "Buying a condo",
	},
	{
		text: "Travelling in a flight",
	},
	{
		text: "Meeting Tyler Durden",
	},
	{
		text: "He makes soap",
	},
	{
		text: "We goto a bar",
	},
	{
		text: "Start a fight",
	},
	{
		text: "We like it",
	},
	{
		text: "Welcome to F**** C***",
	},
];
export default () => {
	const { data: session, isPending } = useSession(authClient);
	const [isLoading, setPending] = useState<boolean>(false);

	useEffect(() => {
		if (isPending) {
			return;
		}
		if (session?.user) {
			const user = session.user;
			if (user.creemCustomerId) {
				toast("Has creemCustomerId");
				redirect("/dashboard");
			}
		}
	}, [isPending, session]);

	if (isPending) {
		return <FlowerLoader />;
	}
	if (!session) {
		redirect("/sign-in");
	}
	return (
		<Content className="p-2">
			<MultiStepLoader
				states={loadingStates}
				isPending={isLoading}
				onStateChange={() => setPending(false)}
			/>
			<div className="mx-auto max-w-7xl px-6">
				<div className="mx-auto md:max-w-2xl self-center">
					<Typography
						type="h2"
						align="center"
						className="text-balance font-bold text-3xl md:text-4xl lg:text-5xl lg:tracking-tight"
					>
						Choose your perfect plan
					</Typography>
					<Typography
						type="body-sm"
						align="center"
						className="text-balance text-foreground/70 text-lg mt-4"
					>
						Scale your applications with advanced features and
						priority support. Scale your business with confidence.
					</Typography>
				</div>
				<div className="container my-12">
					<div className="mx-auto max-w-6xl">
						<Pricing />
					</div>
				</div>
			</div>
			<Button onPress={() => setPending((prev) => !prev)}>Loading</Button>
		</Content>
	);
};
