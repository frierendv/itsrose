import {
	PROVIDER_RESOURCES_TABLE,
	STUDIO_SCHEMA_PLUGIN_ID,
	studioSchema,
	studioSchemaPlugin,
} from "../src/schema";

describe("studio schema plugin", () => {
	it("is a schema-only plugin under the studio id", () => {
		expect(STUDIO_SCHEMA_PLUGIN_ID).toBe("studio-schema");
		expect(studioSchemaPlugin.id).toBe(STUDIO_SCHEMA_PLUGIN_ID);
		expect(studioSchemaPlugin.endpoints).toEqual({});
	});

	it("declares the provider resource table and its model name", () => {
		expect(PROVIDER_RESOURCES_TABLE).toBe("provider_resources");
		expect(studioSchema).toHaveProperty(PROVIDER_RESOURCES_TABLE);

		const table = studioSchema[PROVIDER_RESOURCES_TABLE];
		expect(table.modelName).toBe(PROVIDER_RESOURCES_TABLE);
	});

	it("carries the ownership columns", () => {
		const { fields } = studioSchema[PROVIDER_RESOURCES_TABLE];

		expect(fields.resource_id).toEqual({
			type: "string",
			required: true,
		});
		expect(fields.provider).toEqual({ type: "string", required: true });
		expect(fields.provider_resource_id).toEqual({
			type: "string",
			required: true,
		});
		expect(fields.tenant_id).toEqual({ type: "string", required: true });
		expect(fields.user_id).toEqual({ type: "string", required: true });
		expect(fields.kind).toEqual({ type: "string", required: true });
		expect(fields.name).toEqual({ type: "string", required: true });
		expect(fields.sample_asset_id).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.created_at).toEqual({ type: "date", required: true });
		expect(fields.deleted_at).toEqual({ type: "date", required: false });
	});

	it("defaults a new row's status to active", () => {
		const { fields } = studioSchema[PROVIDER_RESOURCES_TABLE];

		expect(fields.status).toEqual({
			type: "string",
			required: true,
			defaultValue: "active",
		});
	});

	it("makes the application and upstream identities unique", () => {
		const { indexes } = studioSchema[PROVIDER_RESOURCES_TABLE];

		expect(indexes).toContainEqual({
			name: "provider_resources_resource_id_uniq",
			fields: ["resource_id"],
			unique: true,
		});
		expect(indexes).toContainEqual({
			name: "provider_resources_provider_resource_uniq",
			fields: ["provider", "provider_resource_id"],
			unique: true,
		});
	});

	it("indexes the ownership lookups", () => {
		const { indexes } = studioSchema[PROVIDER_RESOURCES_TABLE];

		expect(indexes).toContainEqual({
			name: "provider_resources_user_id_idx",
			fields: ["user_id"],
		});
		expect(indexes).toContainEqual({
			name: "provider_resources_tenant_id_idx",
			fields: ["tenant_id"],
		});
		expect(indexes).toContainEqual({
			name: "provider_resources_kind_idx",
			fields: ["kind"],
		});
	});
});
