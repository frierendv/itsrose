/**
 * Generic JSON object key-value dictionary.
 */
export type JsonObject = Record<string, unknown>;

/**
 * Metadata profile for MTXX media payloads.
 */
export type MediaProfile = {
	/** Data format type (e.g. image format). */
	media_data_type: string;
	/** Optional media type specifier. */
	media_type?: string;
	/** Additional metadata properties. */
	meta?: JsonObject;
};

/**
 * Detailed media payload info.
 */
export type MediaInfo = {
	/** Base64 or binary string of the media. */
	media_data: string;
	/** Extra media metadata. */
	media_extra: JsonObject;
	/** Media profile information. */
	media_profiles: MediaProfile;
};

/**
 * Parameters object for inference processing.
 */
export type Parameters = JsonObject & {
	/** Expected response media type. */
	rsp_media_type: string;
};

/**
 * Raw MTLab inference result payload.
 *
 * @template T Optional extended properties.
 */
export type MtlabInferenceData<T = object> = {
	ErrorCode: number;
	ErrorMsg: string;
	error_code: number;
	error_msg: string;
	media_info_list: MediaInfo[];
	msg_id: string;
	parameter: Parameters;
} & T;

/**
 * Result structure returned by MTXX processing tasks.
 */
export type Result = {
	id: string;
	urls: string[];
	images: string[];
	parameters: Parameters;
	data: MtlabInferenceData;
	mtlab_res: MtlabInferenceData;
	media_info: JsonObject[];
	media_info_list: MediaInfo[];
};

/**
 * Task inference container.
 *
 * @template T Extended result type.
 */
export interface IInferenceData<T = object> {
	result: T & Result;
	task_id: string;
	custom_task_id: string;
}

/**
 * Full top-level inference API response structure.
 *
 * @template T Extended result payload type.
 */
export interface IInferenceResponse<T = object> {
	code: number;
	message: string;
	data: IInferenceData<T>;
}
