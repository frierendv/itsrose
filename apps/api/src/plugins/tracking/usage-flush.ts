import {
	createUsageDayReader,
	createUsageLedger,
	createUsageRateStore,
} from "@/lib/usage";
import { flushUsageRollups, utcDayRange } from "@itsrose/auth-usage/server";
import fp from "fastify-plugin";

const DEFAULT_FLUSH_DAYS = 3;

/**
 * Optional in-process flush/backfill of the hot counters into the durable
 * ledger.
 *
 * Disabled unless `USAGE_FLUSH_INTERVAL_SECONDS` is set, because the ledger
 * upsert is monotonic but replicated instances should not all run the job:
 * enable it on exactly one instance, or drive `POST /auth/usage/admin/flush`
 * from an external scheduler.
 */
export default fp(
	async (fastify) => {
		const raw = fastify.env.USAGE_FLUSH_INTERVAL_SECONDS;
		const intervalSeconds = Number(raw ?? 0);

		if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
			return;
		}

		const dayReader = createUsageDayReader(fastify);
		const ledger = createUsageLedger(fastify);
		const rates = createUsageRateStore(fastify);

		async function runFlush(): Promise<void> {
			const weights = await rates.listWeights(new Date()).catch(() => []);
			const result = await flushUsageRollups({
				dayReader,
				ledger,
				weights,
				days: utcDayRange(DEFAULT_FLUSH_DAYS),
			});
			void fastify.log.info(
				{ ...result, event: "usage_flush" },
				"Flushed usage rollups"
			);
		}

		const timer = setInterval(() => {
			void runFlush().catch((err: unknown) => {
				fastify.log.warn({ err }, "Usage flush failed");
			});
		}, intervalSeconds * 1000);
		timer.unref();

		void fastify.addHook("onClose", async () => {
			clearInterval(timer);
		});
	},
	{ dependencies: ["redis-storage", "database", "auth"] }
);
