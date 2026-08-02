export const BSP = "com.bigwinepot.nwdn.international";

export const ORACLE_API_VERSION = "v2";

export const ORACLE_BASE_HEADER = {
	"Bsp-Id": `${BSP}.android`,
	// Environment
	Environment: "Production",
	"First-Install-Timestamp": "1.73062920264E9",
	// "First-Install-Timestamp": (Date.now() / 1000)
	// 	.toExponential(12)
	// 	.toUpperCase()
	// 	.replace("+", ""),
};

export const BUILD = {
	// "Build-Number": "202522290",
	// "Build-Version": "3.7.1367",
	"Build-Number": "202468929",
	"Build-Version": "3.7.816",
};

export const DEVICE = {
	// device
	"Device-Model": "POCO X3 NFC",
	"Device-Type": "6.7",
	"Device-Manufacturer": "Xiaomi",
	// api / sdk api
	"OS-Version": "34",

	Platform: "Android",
};

export const COMMON = {
	"Is-App-Running-In-Background": "true",
	"Is-Old-User": "false",
	Country: "US",
	Language: "en",
	Locale: "en_US",
	Timezone: "Asia/Jakarta",
};
