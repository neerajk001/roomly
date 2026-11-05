import { v2 as cloudinary } from "cloudinary";
import { describe, expect, it } from "vitest";
import { cloudinaryAssetForKey, createCloudinaryUploadTarget } from "./cloudinary";

const config = {
  cloudName: "demo-cloud",
  apiKey: "123456789",
  apiSecret: "test-secret",
};

describe("cloudinaryAssetForKey", () => {
  it("strips the extension from image public IDs", () => {
    expect(cloudinaryAssetForKey("ws/ws_1/RENDER/asset_1.jpg")).toEqual({
      publicId: "ws/ws_1/RENDER/asset_1",
      format: "jpg",
      resourceType: "image",
    });
  });

  it("normalizes jpeg to jpg and keeps PDFs as images", () => {
    expect(cloudinaryAssetForKey("ws/ws_1/RENDER/asset_1.jpeg").format).toBe("jpg");
    expect(cloudinaryAssetForKey("ws/ws_1/pdf/proposal_1.pdf").resourceType).toBe("image");
  });

  it("keeps the extension for raw assets", () => {
    expect(cloudinaryAssetForKey("ws/ws_1/OTHER/file.bin")).toEqual({
      publicId: "ws/ws_1/OTHER/file.bin",
      format: "bin",
      resourceType: "raw",
    });
  });
});

describe("createCloudinaryUploadTarget", () => {
  it("returns a signed multipart POST with no secrets", () => {
    const target = createCloudinaryUploadTarget({
      key: "ws/ws_1/ORIGINAL_PHOTO/asset_1.jpg",
      contentType: "image/jpeg",
      config,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(target.method).toBe("POST");
    expect(target.url).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    expect(target.fields?.public_id).toBe("ws/ws_1/ORIGINAL_PHOTO/asset_1");
    expect(target.fields?.type).toBe("private");
    expect(target.fields?.allowed_formats).toBe("jpg,jpeg");
    expect(target.fields?.api_key).toBe(config.apiKey);
    expect(JSON.stringify(target.fields)).not.toContain(config.apiSecret);

    const { api_key: apiKey, signature, ...signed } = target.fields ?? {};
    expect(apiKey).toBe(config.apiKey);
    expect(signature).toBe(cloudinary.utils.api_sign_request(signed, config.apiSecret));
  });
});
