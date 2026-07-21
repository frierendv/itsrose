export type JsonObject = Record<string, unknown>;

export type MediaProfile = {
	media_data_type: string;
	media_type?: string;
	meta?: JsonObject;
};

export type MediaInfo = {
	media_data: string;
	media_extra: JsonObject;
	media_profiles: MediaProfile;
};

export type Parameters = JsonObject & {
	rsp_media_type: string;
};

export type MtlabInferenceData<T = object> = {
	ErrorCode: number;
	ErrorMsg: string;
	error_code: number;
	error_msg: string;
	media_info_list: MediaInfo[];
	msg_id: string;
	parameter: Parameters;
} & T;

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

export interface IInferenceData<T = object> {
	result: T & Result;
	task_id: string;
	custom_task_id: string;
}

export interface IInferenceResponse<T = object> {
	code: number;
	message: string;
	data: IInferenceData<T>;
}
