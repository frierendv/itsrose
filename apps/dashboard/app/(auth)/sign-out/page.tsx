import { createAuthMetadata } from "@/lib/auth";
import { SignOut } from "@better-auth-ui/heroui";

export const generateMetadata = createAuthMetadata("auth", "signOut");

export default function SignOutPage() {
	return <SignOut />;
}
