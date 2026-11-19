/**
 * Public surface of the asset feature: the page the route renders.
 *
 * The API client, hooks and payload schemas are internal to the feature and
 * are reached by relative path; exporting them would widen the bundle graph
 * for every consumer of the barrel.
 */
export { AssetsPage } from "./pages/assets-page";
