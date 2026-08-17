function asNextPublic(envKey: string) {
	return "NEXT_PUBLIC_" + envKey;
}
export const config = {
	/**  ----------------- site config -----------------  */
	/** `NEXT_PUBLIC_APP_NAME` */
	APP_NAME: process.env[asNextPublic("APP_NAME")] || "ItsRose",
	/** `NEXT_PUBLIC_APP_TITLE` */
	APP_TITLE: process.env[asNextPublic("APP_TITLE")] || "ItsRose Platform",
	/** `NEXT_PUBLIC_APP_DOMAIN` */
	APP_DOMAIN: process.env[asNextPublic("APP_DOMAIN")] || "itsrose.net",
	/** `NEXT_PUBLIC_APP_BASE_URL` */
	APP_BASE_URL: new URL(
		process.env[asNextPublic("APP_BASE_URL")] || "https://itsrose.net"
	),
	/** `NEXT_PUBLIC_APP_DESCRIPTION` */
	APP_DESCRIPTION:
		process.env[asNextPublic("APP_DESCRIPTION")] ||
		"ItsRose provide you an easy to integrate APIs.",

	/**  ----------------- auth config -----------------  */
	/** `NEXT_PUBLIC_AUTH_BASE_URL` */
	AUTH_BASE_URL: process.env[asNextPublic("AUTH_BASE_URL")],
	/** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` */
	GOOGLE_CLIENT_ID: process.env[asNextPublic("GOOGLE_CLIENT_ID")],
	/** `NEXT_PUBLIC_` */

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
