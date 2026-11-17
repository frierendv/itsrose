import {
	CHARACTER_AI_ROUTE_PREFIX,
	characterAiRoutes,
	type CharacterAiRoutesOptions,
} from "@itsrose/api-routes/character-ai";

export const autoConfig: CharacterAiRoutesOptions = {
	prefix: CHARACTER_AI_ROUTE_PREFIX,
};

export default characterAiRoutes;
