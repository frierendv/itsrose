function asNextPublic(envKey: string) {
	return "NEXT_PUBLIC_" + envKey;
}

function resolveAppBaseUrl(): URL {
	return new URL(
		process.env[asNextPublic("APP_BASE_URL")] ||
			"https://dash.itsrose.my.id"
	);
}

const APP_BASE_URL = resolveAppBaseUrl();

export const config = {
	/**  ----------------- site config -----------------  */
	/** `NEXT_PUBLIC_APP_NAME` */
	APP_NAME: process.env[asNextPublic("APP_NAME")] || "ItsRose",
	/** `NEXT_PUBLIC_APP_TITLE` */
	APP_TITLE: process.env[asNextPublic("APP_TITLE")] || "ItsRose Platform",
	/** `NEXT_PUBLIC_APP_BASE_URL` */
	APP_BASE_URL,
	/** `NEXT_PUBLIC_APP_DESCRIPTION` */
	APP_DESCRIPTION:
		process.env[asNextPublic("APP_DESCRIPTION")] ||
		"ItsRose provide you an easy to integrate APIs.",

	/**  ----------------- auth config -----------------  */
	/**
	 * `NEXT_PUBLIC_AUTH_BASE_URL`
	 * Falls back to the app origin so server-side calls (proxy) and the
	 * browser client resolve against the same deployment.
	 */
	AUTH_BASE_URL:
		process.env[asNextPublic("AUTH_BASE_URL")] || APP_BASE_URL.origin,

	/**  ----------------- author config -----------------  */
	authors: {
		github: {
			/** `NEXT_PUBLIC_AUTHOR_GITHUB_TITLE` */
			title: process.env[asNextPublic("AUTHOR_GITHUB_TITLE")],
			/** `NEXT_PUBLIC_AUTHOR_GITHUB_URL` */
			url: process.env[asNextPublic("AUTHOR_GITHUB_URL")],
		},
	},
};
