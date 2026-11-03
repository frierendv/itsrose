import { Auth } from "@better-auth-ui/heroui";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Authentication Error",
};

export default function AuthErrorPage() {
	return <Auth view="error" />;
}
