/**
 * The endpoints the scrapers talk to.
 *
 * They are kept in one place so a scraper can be pointed at another host —
 * a stub server in a test, for instance — without touching the request it
 * builds.
 */
export const FSAVE_ENDPOINT = "https://fsave.io/action.php?lang=en";
export const SAVEFROM_ENDPOINT = "https://save-from.net/api/convert";
export const VIDEODROPPER_ENDPOINT = "https://api.videodropper.app/allinone";
