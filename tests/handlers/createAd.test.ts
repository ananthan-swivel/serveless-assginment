import { handler } from "../../src/handlers/createAd";
import { HttpStatus, HttpMessage } from "../../src/constants/httpStatus";

jest.mock("../../src/services/dynamoService", () => ({ putAd: jest.fn() }));
jest.mock("../../src/services/s3Service", () => ({
  uploadImage: jest.fn().mockResolvedValue("https://bucket/ads/id.jpg"),
}));
jest.mock("../../src/services/snsService", () => ({
  publishAdCreated: jest.fn(),
}));

// Minimal valid base64-encoded images (1×1 pixel)
const JPEG_DATA_URI =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAROAACAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB//EAB8QAAICAgMBAQAAAAAAAAAAAAECAxESBCExQf/aAAwDAQACEQMRAD8Amz19IqJNp2z5INboKqe+0VmPy7v5v8ArrpNGzmpQjJSSUl0AxoFNKST2QAAAAASUVORK5CYII=";

const PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Generates a data URI whose decoded payload exceeds 5 MB */
function buildOversizedDataUri(): string {
  // Each base64 char ≈ 0.75 bytes decoded; need > 5*1024*1024 decoded bytes
  const oversizedPayload = "A".repeat(7_500_000); // ~5.6 MB decoded
  return `data:image/jpeg;base64,${oversizedPayload}`;
}

function makeEvent(body: unknown, requestId = "req-test"): any {
  return {
    body: JSON.stringify(body),
    requestContext: { requestId },
  };
}

describe("createAd handler", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Happy paths ──────────────────────────────────────────────────────────

  it("returns 201 for valid input without image", async () => {
    const res = await handler(makeEvent({ title: "Test Ad", price: 10 }));

    expect(res.statusCode).toBe(HttpStatus.CREATED);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Test Ad");
    expect(body.price).toBe(10);
    expect(body.adId).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.imageUrl).toBeUndefined();
  });

  it("returns 201 for valid input with JPEG image", async () => {
    const res = await handler(
      makeEvent({ title: "JPEG Ad", price: 25, imageBase64: JPEG_DATA_URI }),
    );

    expect(res.statusCode).toBe(HttpStatus.CREATED);
    const body = JSON.parse(res.body);
    expect(body.imageUrl).toBeDefined();
  });

  it("returns 201 for valid input with PNG image", async () => {
    const res = await handler(
      makeEvent({ title: "PNG Ad", price: 30, imageBase64: PNG_DATA_URI }),
    );

    expect(res.statusCode).toBe(HttpStatus.CREATED);
    const body = JSON.parse(res.body);
    expect(body.imageUrl).toBeDefined();
  });

  // ── Missing / malformed body ─────────────────────────────────────────────

  it("returns 400 when body is missing", async () => {
    const res = await handler({
      body: null,
      requestContext: { requestId: "r" },
    } as any);

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.MISSING_BODY);
  });

  // ── Title validation ─────────────────────────────────────────────────────

  it("returns 400 when title is empty string", async () => {
    const res = await handler(makeEvent({ title: "", price: 10 }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.VALIDATION_ERROR);
    expect(body.errors).toBeDefined();
  });

  it("returns 400 when title is missing", async () => {
    const res = await handler(makeEvent({ price: 10 }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  // ── Price validation ─────────────────────────────────────────────────────

  it("returns 400 when price is a string", async () => {
    const res = await handler(makeEvent({ title: "Ad", price: "free" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.VALIDATION_ERROR);
    expect(body.errors).toBeDefined();
  });

  it("returns 400 when price is negative", async () => {
    const res = await handler(makeEvent({ title: "Ad", price: -5 }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it("returns 400 when price is zero", async () => {
    const res = await handler(makeEvent({ title: "Ad", price: 0 }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it("returns 400 when price is missing", async () => {
    const res = await handler(makeEvent({ title: "Ad" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  // ── Image validation ─────────────────────────────────────────────────────

  it("returns 400 for plain base64 without data URI prefix", async () => {
    const res = await handler(
      makeEvent({ title: "Ad", price: 10, imageBase64: "Zm9v" }),
    );

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  it("returns 400 for unsupported image format (tiff)", async () => {
    const res = await handler(
      makeEvent({
        title: "Ad",
        price: 10,
        imageBase64: "data:image/tiff;base64,iVBOR",
      }),
    );

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });

  it("returns 400 when image exceeds 5 MB", async () => {
    const res = await handler(
      makeEvent({
        title: "Ad",
        price: 10,
        imageBase64: buildOversizedDataUri(),
      }),
    );

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.errors[0].message).toBe("Image must not exceed 5 MB");
  });

  // ── Service error ────────────────────────────────────────────────────────

  it("returns 500 when a downstream service throws", async () => {
    const { putAd } = require("../../src/services/dynamoService");
    (putAd as jest.Mock).mockRejectedValueOnce(
      new Error("DynamoDB unavailable"),
    );

    const res = await handler(makeEvent({ title: "Ad", price: 10 }));

    expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(res.body);
    expect(body.message).toBe("DynamoDB unavailable");
  });
});
