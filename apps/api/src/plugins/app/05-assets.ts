import { randomUUID } from "node:crypto";
import { resolvePlanEntitlements } from "@itsrose/auth-billing";
import { getStorageClient } from "@itsrose/auth-storage";
import {
	createAssetService,
	type AssetEntitlementPort,
	type AssetObjectStorePort,
	type AssetService,
} from "@itsrose/auth-storage/assets";
import { createPostgresAssetRegistry } from "@itsrose/auth-storage/registry";
import fp from "fastify-plugin";

/**
 * The durable asset service, wired to the app's database, object storage and
 * billing.
 *
 * The service itself lives in `@itsrose/auth-storage/assets` and owns the
 * upload/list/read/delete rules; this plugin only supplies the ports: the
 * Postgres registry, the R2 object store and the plan entitlements resolved
 * from the caller's subscription.
 */
export default fp(
	async (fastify) => {
		/**
		 * The object-storage port.
		 *
		 * Durable assets share the bucket with the ephemeral objects, so the
		 * port reuses the storage package's singleton client rather than
		 * constructing a second one.
		 */
		const objects: AssetObjectStorePort = {
			async put({ key, body, contentType }) {
				await getStorageClient().upload(key, body, { contentType });
			},
			download(key) {
				return getStorageClient().download(key);
			},
			async remove(key) {
				await getStorageClient().delete(key);
			},
			presignGet(key, ttlSeconds) {
				return getStorageClient().getPresignedUrl(key, ttlSeconds);
			},
		};

		/**
		 * The entitlement port.
		 *
		 * The subscription already carries the plan's typed entitlements, and
		 * the billing domain owns their tolerant decode; storage never parses
		 * `features`.
		 */
		const entitlements: AssetEntitlementPort = {
			async forUser(userId) {
				const subscription = await fastify.subscription.get(userId);
				return resolvePlanEntitlements(subscription.plan.entitlements);
			},
		};

		void fastify.decorate(
			"assetService",
			createAssetService({
				registry: createPostgresAssetRegistry(fastify.database),
				objects,
				entitlements,
				clock: () => new Date(),
				newId: () => randomUUID(),
			})
		);
	},
	{
		name: "assets",
		dependencies: ["auth", "database"],
	}
);

declare module "fastify" {
	interface FastifyInstance {
		assetService: AssetService;
	}
}
