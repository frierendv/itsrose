/** Generations requested per page. The API accepts a limit between 1 and 100. */
export const SPEECH_GENERATIONS_PAGE_SIZE = 20;

/** The API's synthesis bound, mirrored for the editor's counter and guard. */
export const SPEECH_MAX_CHARACTERS = 5000;

/** Canonical dashboard route of the speech surface. */
export const SPEECH_ROUTE = "/speech";

/**
 * The direction tags the editor's insert menu offers.
 *
 * The synthesiser reads a bracketed hint as a performance direction rather
 * than spoken text; these are the common ones, offered so the owner does not
 * have to type them (and cannot mistype them) by hand.
 */
export const SPEECH_DIRECTION_TAGS = [
	"[sighs]",
	"[chuckles]",
	"[laughs]",
	"[whispers]",
	"[clears throat]",
] as const;
