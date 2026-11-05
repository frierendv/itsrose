import { USAGE_QUOTA_MODE_SOFT, USAGE_UNIT_REQUEST } from "../constants";
import { normalizeQuotaMode } from "../domain/units";
import { tenantIdForUser } from "../keys";
import type {
	TenantResolverPort,
	TenantSyncPort,
	UsageClockPort,
	UsageCounterPort,
	UsageDayReaderPort,
	UsageInvoicePort,
	UsageLedgerPort,
	UsagePlanPort,
	UsageQuotaMode,
	UsageRateStorePort,
} from "../types";

/**
 * Options for the usage transport plugin.
 *
 * Every port beyond the counter is optional so the plugin degrades gracefully:
 * a host that only wants analytics still works, while the full deployment adds
 * the durable ledger, quotas, rates and settlement.
 */
export type UsagePluginOptions = {
	/** Hot counters. Required: it backs every read endpoint. */
	counter: UsageCounterPort;
	/** Session user -> tenant. Defaults to the deterministic personal tenant. */
	tenant?: TenantResolverPort;
	/** Durable ledger (enables flush/backfill and settlement). */
	ledger?: UsageLedgerPort;
	/** Counter read side used by flush/backfill. */
	dayReader?: UsageDayReaderPort;
	/** Unit rates and endpoint weights. */
	rates?: UsageRateStorePort;
	/** Entitlement resolution (plan tier + monthly quota). */
	plans?: UsagePlanPort;
	/** Provider invoice creation for settlement. */
	invoices?: UsageInvoicePort;
	/** Backfills tenant rows for users created before the feature shipped. */
	tenantSync?: TenantSyncPort;
	/** Metered unit id. Defaults to `request`. */
	unit?: string;
	/** Quota enforcement mode. Defaults to `soft`. */
	quota_mode?: UsageQuotaMode;
	/** Injectable clock, used by tests. */
	clock?: UsageClockPort;
};

export type ResolvedUsageOptions = UsagePluginOptions & {
	tenant: TenantResolverPort;
	unit: string;
	quota_mode: UsageQuotaMode;
	clock: UsageClockPort;
};

export const defaultTenantResolver: TenantResolverPort = {
	async forUser(userId: string) {
		return { tenant_id: tenantIdForUser(userId) };
	},
};

export function resolveUsageOptions(
	options: UsagePluginOptions
): ResolvedUsageOptions {
	return {
		...options,
		tenant: options.tenant ?? defaultTenantResolver,
		unit: options.unit ?? USAGE_UNIT_REQUEST,
		quota_mode: normalizeQuotaMode(
			options.quota_mode ?? USAGE_QUOTA_MODE_SOFT
		),
		clock: options.clock ?? { now: () => new Date() },
	};
}
