import {
	GENERATIONS_TABLE,
	PROVIDER_RESOURCES_TABLE,
	providerResourcesSchema,
	providerResourcesSchemaPlugin,
	RESOURCES_SCHEMA_PLUGIN_ID,
} from "../src/schema";

describe("generation schema", () => {
	it("declares both ledger tables under the resources plugin id", () => {
		expect(RESOURCES_SCHEMA_PLUGIN_ID).toBe("resources-schema");
		expect(providerResourcesSchemaPlugin.id).toBe(
			RESOURCES_SCHEMA_PLUGIN_ID
		);
		expect(providerResourcesSchemaPlugin.endpoints).toEqual({});
		expect(Object.keys(providerResourcesSchemaPlugin.schema)).toEqual([
			PROVIDER_RESOURCES_TABLE,
			GENERATIONS_TABLE,
		]);
	});

	it("declares the generations table and its model name", () => {
		expect(GENERATIONS_TABLE).toBe("generations");
		expect(providerResourcesSchema).toHaveProperty(GENERATIONS_TABLE);

		const table = providerResourcesSchema[GENERATIONS_TABLE];
		expect(table.modelName).toBe(GENERATIONS_TABLE);
	});

	it("carries the ownership, provenance and result columns", () => {
		const { fields } = providerResourcesSchema[GENERATIONS_TABLE];

		expect(fields.generation_id).toEqual({
			type: "string",
			required: true,
		});
		expect(fields.tenant_id).toEqual({ type: "string", required: true });
		expect(fields.user_id).toEqual({ type: "string", required: true });
		expect(fields.feature).toEqual({ type: "string", required: true });
		expect(fields.provider).toEqual({ type: "string", required: true });
		expect(fields.provider_task_id).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.input_text).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.input_params).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.result_key).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.result_content_type).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.result_asset_id).toEqual({
			type: "string",
			required: false,
		});
		expect(fields.expires_at).toEqual({ type: "date", required: false });
		expect(fields.created_at).toEqual({ type: "date", required: true });
		expect(fields.deleted_at).toEqual({ type: "date", required: false });
	});

	it("defaults a new row's status to succeeded", () => {
		const { fields } = providerResourcesSchema[GENERATIONS_TABLE];

		expect(fields.status).toEqual({
			type: "string",
			required: true,
			defaultValue: "succeeded",
		});
	});

	it("makes the application identity unique", () => {
		const { indexes } = providerResourcesSchema[GENERATIONS_TABLE];

		expect(indexes).toContainEqual({
			name: "generations_generation_id_uniq",
			fields: ["generation_id"],
			unique: true,
		});
	});

	it("indexes the history and accounting lookups", () => {
		const { indexes } = providerResourcesSchema[GENERATIONS_TABLE];

		expect(indexes).toContainEqual({
			name: "generations_user_id_created_at_idx",
			fields: ["user_id", "created_at"],
		});
		expect(indexes).toContainEqual({
			name: "generations_tenant_id_created_at_idx",
			fields: ["tenant_id", "created_at"],
		});
	});
});
