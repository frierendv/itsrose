import { Pool, type PoolConfig } from "pg";

export function createDatabasePool(poolConfig: PoolConfig) {
	const pool = new Pool(poolConfig);

	return pool;
}

export type DatabasePool = ReturnType<typeof createDatabasePool>;
