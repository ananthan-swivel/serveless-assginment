jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest
    .fn()
    .mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn().mockImplementation((args: unknown) => args),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation(
      (_client: unknown, cmd: { Bucket: string; Key: string }) =>
        Promise.resolve(
          `https://${cmd.Bucket}.s3.us-east-1.amazonaws.com/${cmd.Key}?X-Amz-Signature=test`,
        ),
    ),
}));

import { uploadImage } from "../../src/services/s3Service";

describe("s3Service", () => {
  beforeEach(() => {
    process.env.ADS_BUCKET = "test-bucket";
    process.env.AWS_REGION = "us-east-1";
  });

  it("uploads image and returns url", async () => {
    // Must be a valid data URI so extractMimeType / extractBase64Payload work correctly
    const dataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const url = await uploadImage("ad-1", dataUri);
    expect(url).toContain("test-bucket");
    expect(url).toContain("ad-1.png");
  });

  it("throws when ADS_BUCKET is not set", async () => {
    delete process.env.ADS_BUCKET;
    const dataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/";
    await expect(uploadImage("ad-2", dataUri)).rejects.toThrow(
      "ADS_BUCKET env var not set",
    );
  });
});
