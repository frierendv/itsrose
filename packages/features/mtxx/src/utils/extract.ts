import { SyncState } from "@itsrose/common";
import type { IInferenceData, Result } from "../types";
import type { ISharedResponse } from "../zod-schema";

export const extractUrls = (result: Result): string[] | null => {
	if (!result) {
		return null;
	}

	if (result.media_info_list?.length) {
		return result.media_info_list.map(({ media_data }) => media_data);
	}

	return result.urls?.length ? result.urls : null;
};

export const parseResult = <T = object>(
	data: IInferenceData<T>
): ISharedResponse => {
	const result = data.result;
	const mediaList = extractUrls(result) || [];

	return {
		task_id: data.custom_task_id || data.task_id,
		status: mediaList?.length ? SyncState.COMPLETED : SyncState.IN_PROGRESS,
		media_list: mediaList,
		meta: result.parameters,
	};
};
