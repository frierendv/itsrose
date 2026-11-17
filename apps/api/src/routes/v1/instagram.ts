import {
	INSTAGRAM_ROUTE_PREFIX,
	instagramRoutes,
	type InstagramRoutesOptions,
} from "@itsrose/api-routes/instagram";

export const autoConfig: InstagramRoutesOptions = {
	prefix: INSTAGRAM_ROUTE_PREFIX,
};

export default instagramRoutes;
