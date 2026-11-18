/**
 * The PixVerse client, replaced by a stub.
 *
 * The stubs answer with the payloads the package publishes - translated
 * statuses and all - so a route test asserts the shape the package would
 * really have handed the route.
 */
import { GetTaskSchema } from "../../../features/pixverse/src/video/get-task";
import {
	ImageToVideoRequestSchema,
	PixverseTaskCreatedResponseSchema,
	PixverseTaskResponseSchema,
	TextToVideoRequestSchema,
} from "../../../features/pixverse/src/zod-schema";

const CREATED = {
	status: "in_progress",
	task_id: "1000000000000003",
	credits: 10,
};

const TASK = {
	status: "completed",
	task_id: "1000000000000003",
	media_list: ["https://pixverse.test/result.mp4"],
	prompt: "A small blue ceramic cup on a plain wooden table.",
	negative_prompt: "",
	quality: "360p",
	duration: 1,
	aspect_ratio: "1:1",
	has_audio: false,
	credits: 5,
	created_at: "2026-10-23T04:03:03Z",
	modified_at: "2026-10-23T04:03:22Z",
};

export const createTextToVideo = async () => CREATED;
export const textToVideoSchema = {
	request: TextToVideoRequestSchema,
	response: PixverseTaskCreatedResponseSchema,
};

export const createImageToVideo = async () => CREATED;
export const imageToVideoSchema = {
	request: ImageToVideoRequestSchema,
	response: PixverseTaskCreatedResponseSchema,
};

export const getTask = async () => TASK;
export const getTaskSchema = {
	request: GetTaskSchema,
	response: PixverseTaskResponseSchema,
};
