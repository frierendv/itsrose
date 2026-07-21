import crypto from "crypto";
import moment from "moment";

const BasicDateFormat = "YYYYMMDD\\THHmmss\\Z";
const Algorithm = "SDK-HMAC-SHA256";
const HeaderXDate = "X-Sdk-Date";
const HeaderAuthorization = "Authorization";

export type OSSHeaders = {
	"X-Sdk-Date": string;
	Authorization: string;
	Host: string;
};

export type SignerOptions = {
	key: string;
	secret: string;
};

export class Signer {
	private readonly Key: string;
	private readonly Secret: string;
	constructor(options: SignerOptions) {
		this.Key = options.key;
		this.Secret = options.secret;
	}

	private signStringToSign(stringToSign: string, signingKey: string) {
		const hmac = crypto.createHmac("sha256", signingKey);
		hmac.update(stringToSign);
		const signature = hmac.digest("hex");
		return signature;
	}

	private authHeaderValue(
		signature: string,
		accessKey: string,
		signedHeaders: string[]
	) {
		const signedHeadersStr = signedHeaders.join(";");
		const headerValue = `${Algorithm} Access=${accessKey}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
		const encodedValue = Buffer.from(headerValue).toString("base64");
		return `Bearer ${encodedValue}`;
	}

	private canonicalRequest(
		method: string,
		url: string,
		headers: Record<string, string>,
		body: string,
		signedHeaders: string[]
	) {
		const canonicalURI = new URL(url).pathname + "/";
		const canonicalQueryString = new URL(url).searchParams.toString();
		const canonicalHeaders = this.canonicalHeaders(headers, signedHeaders);
		const signedHeadersStr = signedHeaders.join(";");
		const hexencode = crypto
			.createHash("sha256")
			.update(body)
			.digest("hex");

		return `${method}\n${canonicalURI}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeadersStr}\n${hexencode}`;
	}

	private canonicalHeaders(
		headers: Record<string, string>,
		signedHeaders: string[]
	) {
		const lowheaders: typeof headers = {};
		for (const [key, value] of Object.entries(headers)) {
			lowheaders[key.toLowerCase()] = value.trim();
		}
		const a = signedHeaders.map((key) => `${key}:${lowheaders[key]}`);
		return a.join("\n");
	}

	private signedHeaders(headers: Record<string, any>) {
		const signedHeaders = Object.keys(headers).map((header) =>
			header.toLowerCase()
		);
		signedHeaders.sort();
		return signedHeaders;
	}

	private stringToSign(canonicalRequest: string, timeFormat: string) {
		const hash = crypto
			.createHash("sha256")
			.update(canonicalRequest)
			.digest("hex");
		return `${Algorithm}\n${timeFormat}\n${hash}`;
	}

	public sign(
		url: string,
		method: string,
		headers: Record<string, string>,
		body: string
	) {
		const dt = headers[HeaderXDate] || "";
		let t;
		if (!dt) {
			t = moment().utc().format(BasicDateFormat);
			headers[HeaderXDate] = t;
		} else {
			t = moment(dt, BasicDateFormat).utc().format(BasicDateFormat);
			headers[HeaderXDate] = t;
		}

		const signedHeaders = this.signedHeaders(headers);
		const canonicalRequest = this.canonicalRequest(
			method,
			url,
			headers,
			body,
			signedHeaders
		);
		const stringToSign = this.stringToSign(
			canonicalRequest,
			headers[HeaderXDate]
		);
		const signature = this.signStringToSign(stringToSign, this.Secret);
		headers[HeaderAuthorization] = this.authHeaderValue(
			signature,
			this.Key,
			signedHeaders
		);

		const urlObj = new URL(url);
		const options = {
			baseURL: urlObj.origin,
			url: urlObj.pathname,
			method,
			headers: headers as OSSHeaders,
			params: urlObj.searchParams,

			// extra
			hostname: urlObj.hostname,
			body,
		};

		return options;
	}
}
