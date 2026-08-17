import "./flower.module.css";
import { cn, forwardRef } from "@/shared/utils";

export const FlowerLoaderTest = forwardRef<"div">(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("__itsroses__loader", className)}
			role="status"
			aria-label="Loading"
			{...props}
		>
			<div className="flower">
				{Array.from({ length: 8 }).map((_, i) => (
					<span
						key={i}
						style={{
							// @ts-expect-error TODO: cast type
							"--i": `${i}`,
						}}
					/>
				))}
				<div className="__itsroses__loader_core" />
			</div>
		</div>
	)
);
