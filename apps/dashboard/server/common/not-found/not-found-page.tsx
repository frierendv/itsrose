import { Content } from "@/components/common";
import { Link } from "@heroui/react/link";

export const NotFoundPage = () => {
	return (
		<Content className="flex relative flex-col items-center justify-center min-h-svh">
			<h2 className="text-4xl font-bold text-center mt-4 z-10">
				404 - Page not found
			</h2>
			<p style={{ lineHeight: "1.8", marginBottom: "2em" }}>
				The page you are looking for does not exist.
			</p>
			<Link href="/">Go back</Link>
		</Content>
	);
};
