import XMLBuilder from "fast-xml-builder";
import fastifyPlugin from "fastify-plugin";

export default fastifyPlugin(async (fastify) => {
	const xmlBuilder = new XMLBuilder({
		ignoreAttributes: false,
		format: true,
		suppressEmptyNode: true,
	});
	// add reply.xml method
	fastify.decorateReply("xml", function (data: any) {
		const xml = xmlBuilder.build(data);
		this.type("application/xml").send(xml);
	});
});
/* eslint-disable @typescript-eslint/naming-convention */
declare module "fastify" {
	interface FastifyReply {
		xml: (data: any) => void;
	}
}
