"use strict";
/**
 * Strip the reverse-proxy forwarding trace before the base image's proxy hands
 * a request to DSH.
 *
 * Traefik always adds `X-Forwarded-For` and `X-Real-Ip`; Cloudflare adds
 * `X-Forwarded-For` as well, and http-proxy forwards every incoming header
 * verbatim, so DSH sees them.
 *
 * dshmarket's privileged routes -- profile backup export, one-click restart,
 * self-uninstall -- admit a request only through one of two shapes
 * (lib/restart.js, `servedAuthority`):
 *
 *   (a) DIRECT: a loopback peer, NO forwarding trace, and a loopback Host.
 *   (b) DECLARED: a Host the host declared via `dsh web --trusted-host`.
 *
 * This image's proxy sets `changeOrigin: true`, so DSH receives
 * `Host: 127.0.0.1:3079` -- a loopback authority. The market deliberately
 * excludes loopback Hosts from (b), so only (a) can match, and (a) fails on the
 * forwarding trace. That is why the backup export answers 403 ("backup export
 * is limited to same-origin loopback requests") while the log export, which has
 * no such guard, works.
 *
 * Removing the trace restores (a) exactly: peer 127.0.0.1, loopback Host,
 * Origin already aligned to the listener by the proxy's own `alignOrigin`.
 * Nothing in DSH reads these three headers; the browser-trust fence decides on
 * Host/Origin only.
 *
 * Loaded with `node --require` so it applies before index.js builds the server.
 * http-proxy derives its upstream request headers from the incoming request, so
 * deleting them here removes them from the forwarded request too.
 */
const http = require("node:http");

/** The exact headers dshmarket's `directLoopbackRequest` treats as a proxy trace. */
const STRIPPED = ["x-forwarded-for", "x-real-ip", "forwarded"];

const { createServer } = http;

http.createServer = function createServerStrippingForwardingTrace(...args) {
	const server = createServer.apply(this, args);
	server.prependListener("request", (request) => {
		for (const name of STRIPPED) {
			if (request.headers[name] !== undefined)
				delete request.headers[name];
		}
	});
	return server;
};
