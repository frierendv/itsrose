/**
 * Public surface of the speech feature: the page the route renders.
 *
 * The editor, panels, API client and schemas are internal to the feature and
 * are reached by relative path; exporting them would widen the bundle graph
 * for every consumer of the barrel.
 */
export { SpeechPage } from "./pages/speech-page";
