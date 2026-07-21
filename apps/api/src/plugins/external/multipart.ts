import fastifyMultipart from "@fastify/multipart";

export const autoConfig = {
	limits: {
		fileSize: 50 * 1024 * 1024,
	},
	attachFieldsToBody: "keyValues",
	// attachFieldsToBody: true,
};

/**
 * This plugins allows to parse the multipart content-type
 *
 * @see {@link https://github.com/fastify/fastify-multipart}
 */
export default fastifyMultipart;
