import { createAuthMetadata } from "@/shared/server";

export { VerifyEmail } from "@better-auth-ui/heroui";
export const generateMetadata = createAuthMetadata("auth", "verifyEmail");
