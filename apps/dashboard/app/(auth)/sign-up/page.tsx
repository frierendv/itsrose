import { createAuthMetadata } from "@/lib/auth";
import { SignUp } from "@better-auth-ui/heroui";

export const generateMetadata = createAuthMetadata("auth", "signUp");

export default function SignUpPage() {
	return <SignUp />;
}
