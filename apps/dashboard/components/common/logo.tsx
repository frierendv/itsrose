import { cn, forwardRef } from "@/shared/utils";
import Image from "next/image";

export const Logo = forwardRef<"div">(
	({ as: Comp = "div", className, ...props }, ref) => (
		<Comp
			ref={ref}
			className={cn("relative w-8 h-8", className)}
			{...props}
		>
			<Image
				src="/web-app-manifest-512x512.png"
				alt="Logo"
				draggable={false}
				fill
				sizes="32px"
				className="object-contain"
			/>
		</Comp>
	)
);
Logo.displayName = "Logo";
