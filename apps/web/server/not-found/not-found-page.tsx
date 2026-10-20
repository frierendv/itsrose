import { Link } from "@heroui/react/link";
import { Typography } from "@heroui/react/typography";

export const NotFoundPage = () => {
	return (
		<div className="flex relative flex-col items-center justify-center min-h-svh">
			<Typography type="h2">404 - Page not found</Typography>
			<Typography
				type="body"
				style={{ lineHeight: "1.8", marginBottom: "2em" }}
			>
				Page that you looking for is not exist.
			</Typography>
			<Link href="/">Go back</Link>
		</div>
	);
};
