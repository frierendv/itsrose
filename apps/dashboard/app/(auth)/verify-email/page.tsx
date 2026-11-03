import { createAuthMetadata } from "@/lib/auth";
import { VerifyEmail } from "@better-auth-ui/heroui";

export const generateMetadata = createAuthMetadata("auth", "verifyEmail");

export default function VerifyEmailPage() {
	return <VerifyEmail />;
}
