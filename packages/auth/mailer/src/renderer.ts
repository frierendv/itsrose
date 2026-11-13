import { render } from "@react-email/render";
import type { ReactElement } from "react";

/**
 * Renders a React Email component to both static HTML and formatted plain text asynchronously.
 */
export async function renderEmail(component: ReactElement): Promise<{
	html: string;
	text: string;
}> {
	try {
		const [html, text] = await Promise.all([
			render(component),
			render(component, { plainText: true }),
		]);
		return { html, text };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`[Mailer] Failed to render email template: ${message}`,
			{
				cause: error,
			}
		);
	}
}
