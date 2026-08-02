import {
	BSP,
	BUILD,
	COMMON,
	DEVICE,
	ORACLE_API_VERSION,
	ORACLE_BASE_HEADER,
} from "../constant";

export const createOracleConfig = (tId: string) => {
	return {
		Aaid: crypto.randomUUID(),
		"Android-Id": tId,
		"Backup-Persistent-Id": `${tId}_${BSP}` as const,
		"Non-Backup-Persistent-Id": crypto.randomUUID(),
		...BUILD,
		...ORACLE_BASE_HEADER,
		...DEVICE,
		...COMMON,
		"settings-response-version": ORACLE_API_VERSION,
	};
};

export type OracleConfig = ReturnType<typeof createOracleConfig>;
