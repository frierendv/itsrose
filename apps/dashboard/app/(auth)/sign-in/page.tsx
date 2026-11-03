import { createAuthMetadata } from "@/lib/auth";
import { SignIn } from "@better-auth-ui/heroui";

export const generateMetadata = createAuthMetadata("auth", "signIn");

export default function SignInPage() {
	return <SignIn />;
}
