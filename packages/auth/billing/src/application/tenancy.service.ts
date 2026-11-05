import { TENANT_KIND, TENANT_ROLE } from "../domain/constants";
import type { BillingRepositories } from "../domain/ports";

export type EnsurePersonalTenantInput = {
	user_id: string;
	/** Deterministic tenant id derived from the user by the caller. */
	tenant_id: string;
	name?: string;
};

export type EnsurePersonalTenantResult = {
	tenant_id: string;
	created: boolean;
};

/**
 * Provisions (idempotently) the 1:1 personal tenant for a user.
 *
 * The tenant id is supplied by the caller so this package stays independent of
 * the metering package's derivation; the id is a deterministic UUID derived
 * from the user id, which is what lets the request hot path attribute traffic
 * without a lookup.
 */
export async function ensurePersonalTenant(
	repositories: Pick<BillingRepositories, "tenants">,
	input: EnsurePersonalTenantInput
): Promise<EnsurePersonalTenantResult> {
	const { tenant, created } = await repositories.tenants.ensure({
		id: input.tenant_id,
		kind: TENANT_KIND.PERSONAL,
		name: input.name ?? "Personal workspace",
		owner_user_id: input.user_id,
	});

	await repositories.tenants.ensureMember({
		tenant_id: tenant.id,
		user_id: input.user_id,
		role: TENANT_ROLE.OWNER,
	});

	return { tenant_id: tenant.id, created };
}

/**
 * Backfills personal tenants for users created before the feature shipped.
 *
 * Idempotent: existing tenants are detected by id and left untouched.
 */
export async function ensureAllPersonalTenants(
	repositories: Pick<BillingRepositories, "tenants" | "users">,
	deriveTenantId: (userId: string) => string,
	limit?: number
): Promise<{ scanned: number; created: number }> {
	const userIds = await repositories.users.findAllIds(limit);
	let created = 0;

	for (const userId of userIds) {
		const result = await ensurePersonalTenant(repositories, {
			user_id: userId,
			tenant_id: deriveTenantId(userId),
		});
		if (result.created) {
			created += 1;
		}
	}

	return { scanned: userIds.length, created };
}
