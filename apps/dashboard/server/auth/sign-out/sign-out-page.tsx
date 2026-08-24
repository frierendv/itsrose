import { createAuthMetadata } from "@/shared/server";

export { SignOut } from "@better-auth-ui/heroui";
export const generateMetadata = createAuthMetadata("auth", "signOut");
