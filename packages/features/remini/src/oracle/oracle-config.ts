export const BSP = "com.bigwinepot.nwdn.international";

export const oracleApiVersion = "v2";

export const baseOracleConfig = {
	"Bsp-Id": `${BSP}.android`,
	// Environment
	Environment: "Production",
	"First-Install-Timestamp": (Date.now() / 1000)
		.toExponential(12)
		.toUpperCase()
		.replace("+", ""),
} as const;

export const oracleBuildConfig = {
	// Oracle
	"Build-Number": "202522290",
	"Build-Version": "3.7.1367",
};

export const oracleDeviceConfig = {
	// device
	"Device-Model": "NE2210",
	"Device-Type": "7.6",
	"Device-Manufacturer": "OnePlus",
	// api
	"OS-Version": "28",

	Platform: "Android",
};

export const oracleCommonConfig = {
	"Is-App-Running-In-Background": "true",
	"Is-Old-User": "false",
	Country: "US",
	Language: "en",
	Locale: "en_US",
	Timezone: "Asia/Jakarta",
};

export const createOracleConfig = (tId: string) => {
	return {
		Aaid: crypto.randomUUID(),
		"Android-Id": tId,
		"Backup-Persistent-Id": `${tId}_${BSP}` as const,
		"Non-Backup-Persistent-Id": crypto.randomUUID(),
		...oracleBuildConfig,
		...baseOracleConfig,
		...oracleDeviceConfig,
		...oracleCommonConfig,
		"settings-response-version": oracleApiVersion,
	};
};
export type OracleConfig = ReturnType<typeof createOracleConfig>;
