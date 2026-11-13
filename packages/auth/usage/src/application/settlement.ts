import { USAGE_UNIT_REQUEST } from "../constants";
import { amountFor, settlementChecksum } from "../domain/units";
import { periodStartDate, previousPeriodString } from "../keys";
import type {
	SettlementResult,
	SettlementTenantResult,
	UsageInvoicePort,
	UsageLedgerPort,
	UsagePlanPort,
	UsageRateStorePort,
	UsageSettlement,
	UsageUnitRate,
} from "../types";

export type SettleUsageInput = {
	ledger: UsageLedgerPort;
	rates: UsageRateStorePort;
	plans: UsagePlanPort;
	invoice?: UsageInvoicePort;
	/** `YYYY-MM`; defaults to the previous (closed) month. */
	period?: string;
	unit?: string;
	/** Dry run by default: pass `true` to create provider invoices. */
	create_invoices?: boolean;
	now?: () => Date;
};

function usageLineDescription(input: {
	period: string;
	unit: string;
	requests: number;
}): string {
	return `API usage ${input.period} — ${input.requests} ${input.unit}(s)`;
}

/**
 * Settles one closed period per tenant/unit from the durable rollups.
 *
 * Idempotency comes from the `(tenant_id, period, unit)` unique index: the
 * first run freezes the numbers, every later run returns the frozen row and
 * never creates a second invoice. The rate is resolved as of the period start
 * and its version is stamped on the settlement, so editing a rate afterwards
 * cannot change an issued invoice.
 */
export async function settleUsagePeriod(
	input: SettleUsageInput
): Promise<SettlementResult> {
	const now = input.now ?? (() => new Date());
	const unit = input.unit ?? USAGE_UNIT_REQUEST;
	const period = input.period ?? previousPeriodString(now());
	const periodStart = periodStartDate(period);
	const totals = await input.ledger.listTenantsWithUsage(period);
	const results: SettlementTenantResult[] = [];
	const summary: SettlementResult["totals"] = {
		tenants: totals.length,
		units_micro: 0,
		amount: 0,
		invoices_created: 0,
		skipped: 0,
		failed: 0,
	};

	for (const tenant of totals) {
		const requests =
			tenant.requests_ok > 0
				? tenant.requests_ok
				: tenant.fallback_requests_ok;
		const unitsMicro =
			tenant.units_micro > 0
				? tenant.units_micro
				: tenant.fallback_units_micro;

		const plan = await input.plans.forTenant(tenant.tenant_id);
		if (!plan) {
			summary.skipped += 1;
			results.push({
				tenant_id: tenant.tenant_id,
				plan_tier: null,
				requests,
				units_micro: unitsMicro,
				amount: 0,
				unit_rate_id: null,
				rates_version: null,
				status: "skipped",
				reason: "tenant_not_resolved",
				created: false,
				invoice_id: null,
			});
			continue;
		}

		let rate: UsageUnitRate | null;
		try {
			rate = await input.rates.resolveAt(
				plan.plan_tier,
				unit,
				periodStart
			);
		} catch (error) {
			summary.failed += 1;
			results.push({
				tenant_id: tenant.tenant_id,
				plan_tier: plan.plan_tier,
				requests,
				units_micro: unitsMicro,
				amount: 0,
				unit_rate_id: null,
				rates_version: null,
				status: "failed",
				reason:
					error instanceof Error
						? error.message
						: "rate_lookup_failed",
				created: false,
				invoice_id: null,
			});
			continue;
		}

		if (!rate) {
			summary.skipped += 1;
			results.push({
				tenant_id: tenant.tenant_id,
				plan_tier: plan.plan_tier,
				requests,
				units_micro: unitsMicro,
				amount: 0,
				unit_rate_id: null,
				rates_version: null,
				status: "skipped",
				reason: "rate_missing",
				created: false,
				invoice_id: null,
			});
			continue;
		}

		const amount = amountFor(unitsMicro, rate.amount);
		const settlement: UsageSettlement = {
			tenant_id: tenant.tenant_id,
			period,
			unit,
			requests,
			units_micro: unitsMicro,
			rates_version: rate.rates_version,
			unit_rate_id: rate.id,
			amount,
			invoice_id: null,
			checksum: settlementChecksum({
				tenant_id: tenant.tenant_id,
				period,
				unit,
				requests,
				units_micro: unitsMicro,
				rates_version: rate.rates_version,
				amount,
			}),
		};

		let invoiceId: string | null = null;
		let created: boolean;

		try {
			const stored = await input.ledger.insertSettlement(settlement);
			created = stored.created;
			invoiceId = stored.settlement.invoice_id ?? null;

			// Retry path: a previous run may have frozen the settlement but
			// failed to issue the invoice. The provider idempotency key makes
			// the retry safe.
			const needsInvoice =
				created || (!stored.settlement.invoice_id && amount > 0);

			if (
				needsInvoice &&
				input.create_invoices === true &&
				amount > 0 &&
				input.invoice &&
				plan.user_id
			) {
				const invoice = await input.invoice.create({
					tenant_id: tenant.tenant_id,
					user_id: plan.user_id,
					period,
					unit,
					amount,
					lines: [
						{
							item_id: `usage:${unit}:${period}`,
							description: usageLineDescription({
								period,
								unit,
								requests,
							}),
							price: amount,
							quantity: 1,
						},
					],
					idempotency_key: `usage:${tenant.tenant_id}:${period}:${unit}`,
					notes: `Usage settlement for ${period}`,
				});
				invoiceId = invoice.invoice_id;
				await input.ledger.updateSettlementInvoice(
					tenant.tenant_id,
					period,
					unit,
					invoiceId
				);
				summary.invoices_created += 1;
			}

			summary.units_micro += unitsMicro;
			summary.amount += amount;

			results.push({
				tenant_id: tenant.tenant_id,
				plan_tier: plan.plan_tier,
				requests,
				units_micro: unitsMicro,
				amount,
				unit_rate_id: rate.id,
				rates_version: rate.rates_version,
				status: "settled",
				created,
				invoice_id: invoiceId,
			});
		} catch (error) {
			summary.failed += 1;
			results.push({
				tenant_id: tenant.tenant_id,
				plan_tier: plan.plan_tier,
				requests,
				units_micro: unitsMicro,
				amount,
				unit_rate_id: rate.id,
				rates_version: rate.rates_version,
				status: "failed",
				reason:
					error instanceof Error
						? error.message
						: "settlement_write_failed",
				created: false,
				invoice_id: invoiceId,
			});
		}
	}

	return { period, unit, tenants: results, totals: summary };
}
