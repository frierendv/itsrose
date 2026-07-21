// import { client } from "../client";
// import { createMediaProfile, createSDKParameter, parseResult } from "../utils";

// export const whiteboardGraffiti = async (opts: any) => {
// 	const { init_image } = opts;
// 	const parameter = createSDKParameter({
// 		task: "txt2img",
// 		task_type: "inference",
// 		params: {
// 			model: "meitu-diffusion-anime_acgn-v1.2.zip",
// 			prompt: "girl",
// 			negative_prompt: "Malformed Limbs",
// 			width: 512,
// 			height: 512,
// 			steps: 20,
// 			batch_size: 1,
// 		},
// 		// init_images: [createMediaProfile(init_image)],
// 	});

// 	const { data } = await client.createTask(parameter);
// 	return parseResult(data);
// };

// client
// 	.request({
// 		baseURL: client.openApiBaseUrl,
// 		url: "/whee/business/text2image.json",
// 		method: "POST",
// 		data: createSDKParameter({
// 			task: "txt2img",
// 			task_type: "inference",
// 			params: {
// 				model: "oriental-esthetics_v1.zip",
// 				prompt: "girl, naked, sexy, beautiful, 1girl, solo, looking at viewer, long hair, black hair, blue eyes, blush, smile, upper body, indoors",
// 				negative_prompt: "Malformed Limbs",
// 				width: 512,
// 				height: 768,
// 				steps: 25,
// 				batch_size: 1,
// 			},
// 			// init_images: [
// 			// 	createMediaProfile({
// 			// 		type: "url",
// 			// 		value: "http://my-material.zone1.meitudata.com/b2665cf996a410b.jpg",
// 			// 	}),
// 			// ],
// 		}),
// 	})
// 	.then(console.log);

// // client
// // 	.request({
// // 		baseURL: client.openApiBaseUrl,
// // 		url: "/whee/business/config.json",
// // 	})
// // 	.then(console.log);

// // client
// // 	.getTaskStatus("t_mt1a3i5n7b1cd2e200-b07e-4814-8764-97d1806e37ee")
// // 	.then(console.log);

// // whiteboardGraffiti({
// // 	init_image: {
// // 		type: "url",
// // 		value: "http://my-material.zone1.meitudata.com/b2665cf996a410b.jpg",
// // 	},
// // }).then(console.log);
