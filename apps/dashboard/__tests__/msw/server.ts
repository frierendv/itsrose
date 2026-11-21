import { setupServer } from "msw/node";

/**
 * The dashboard's MSW server.
 *
 * The setup file starts it before the suite, resets the handlers between
 * tests and closes it afterwards. A test adds its own handlers with
 * `server.use(...)`, so no handler is shared across files by accident.
 */
export const server = setupServer();
