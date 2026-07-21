import type { FastifyReplyFromHooks } from "@fastify/reply-from";
import { ERROR_CODE } from "@itsrose/http-code";

const HTTP_ERROR_CODE = Object.values(ERROR_CODE).reduce(
	(acc, value) => {
		acc[value.http_code] = value;
		return acc;
	},
	{} as Record<number, (typeof ERROR_CODE)[keyof typeof ERROR_CODE]>
);

export const handleResponse: FastifyReplyFromHooks["onResponse"] = async (
	request,
	reply,
	response
) => {
	if (HTTP_ERROR_CODE[response.statusCode]) {
		const error = HTTP_ERROR_CODE[response.statusCode];
		return reply.status(response.statusCode).xml({
			Error: {
				Code: error!.code,
				Message: error!.message,
				RequestId: request.id,
				HostId: request.hostname,
				Resource: request.url,
			},
		});
	}
	return reply.send(response.stream);
};
