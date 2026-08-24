import { createAuthMetadata } from "@/shared/server";

export { SignIn } from "@better-auth-ui/heroui";
export const generateMetadata = createAuthMetadata("auth", "signIn");
