import { extractImageMetadata } from "../src/utils/extract-image-metadata";
import { ReminiRequestSchema } from "../src/zod-schema/request";

jest.mock("image-size", () => ({
	imageSize: (buf: Buffer) => {
		if (buf.toString().includes("no-type")) {
			return { width: 10, height: 10, type: undefined };
		}
		return jest.requireActual("image-size").imageSize(buf);
	},
}));

describe("features/remini", () => {
	describe("extractImageMetadata", () => {
		it("extracts dimensions, md5, and type from valid PNG buffer", () => {
			// 1x1 PNG base64
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const buffer = Buffer.from(base64Png, "base64");
			const [isOk, metadata] = extractImageMetadata(buffer);

			expect(isOk).toBe(true);
			expect(metadata.image_content_type).toBe("image/png");
			expect(metadata.image_resolution_width).toBe(1);
			expect(metadata.image_resolution_height).toBe(1);
			expect(metadata.image_size).toBe(buffer.length);
			expect(metadata.image_md5).toBeDefined();
		});

		it("falls back to jpg image content type when type is not determined by imageSize", () => {
			const mockBuffer = Buffer.from("no-type-buffer");
			const [isOk, metadata] = extractImageMetadata(mockBuffer);

			expect(isOk).toBe(true);
			expect(metadata.image_content_type).toBe("image/jpg");
			expect(metadata.image_resolution_width).toBe(10);
			expect(metadata.image_resolution_height).toBe(10);
		});
	});

	describe("ReminiRequestSchema", () => {
		it("validates remini request payload", () => {
			const payload = {
				init_image: "https://example.com/photo.jpg",
				pipelines: [
					{ face_enhance: { model: "remini", pre_blur: 0.5 } },
				],
			};
			const result = ReminiRequestSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});
	});
});
