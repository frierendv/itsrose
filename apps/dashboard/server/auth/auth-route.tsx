import { AuthLayout } from "@/components/layout";
import { localization, viewPaths } from "@better-auth-ui/core";
import { Auth } from "@better-auth-ui/heroui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type AuthRouteProps = {
	params: Promise<{
		path: string;
	}>;
};
export const AuthRoute = async ({ params }: AuthRouteProps) => {
	const { path } = await params;

	const authPath = Object.values(viewPaths.auth).find(
		(v) => v === path
	) as string;
	if (!authPath) {
		notFound();
	}

	return (
		<AuthLayout>
			<Auth path={authPath} variant="transparent" />
		</AuthLayout>
	);
};

export const generateMetadata = async ({
	params,
}: AuthRouteProps): Promise<Metadata> => {
	const { path } = await params;

	const authPath = Object.values(viewPaths.auth).find(
		(v) => v === path
	) as string;
	if (!authPath) {
		notFound();
	}
	const authKey = Object.keys(viewPaths.auth).filter(
		// @ts-expect-error tired of casting {keyof AuthViewPaths}
		(v) => viewPaths.auth[v] === authPath
	)[0];
	// @ts-expect-error tired of casting {keyof AuthViewPaths}
	const title = localization.auth[authKey];
	if (!title) {
		notFound();
	}
	return {
		title,
	};
};
