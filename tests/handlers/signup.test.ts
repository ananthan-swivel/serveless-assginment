import { handler } from "../../src/handlers/signup";
import { HttpStatus, HttpMessage } from "../../src/constants/httpStatus";

jest.mock("../../src/services/cognitoService", () => ({
  signUpUser: jest.fn(),
  adminConfirmUser: jest.fn(),
}));

import { signUpUser, adminConfirmUser } from "../../src/services/cognitoService";

const mockSignUpUser = signUpUser as jest.Mock;
const mockAdminConfirmUser = adminConfirmUser as jest.Mock;

function makeEvent(body: unknown): any {
  return {
    body: JSON.stringify(body),
    requestContext: { requestId: "req-signup-test" },
  };
}

describe("signup handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COGNITO_CLIENT_ID = "test-client-id";
    process.env.USER_POOL_ID = "us-east-1_testPool";
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it("returns 201 when signup succeeds", async () => {
    mockSignUpUser.mockResolvedValue(undefined);
    mockAdminConfirmUser.mockResolvedValue(undefined);

    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.CREATED);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.USER_CREATED);
    expect(mockSignUpUser).toHaveBeenCalledWith(
      "user@example.com",
      "MyPass123",
      "test-client-id",
    );
    expect(mockAdminConfirmUser).toHaveBeenCalledWith(
      "user@example.com",
      "us-east-1_testPool",
    );
  });

  // ── Missing / malformed body ─────────────────────────────────────────────

  it("returns 400 when body is missing", async () => {
    const res = await handler({
      body: null,
      requestContext: { requestId: "r" },
    } as any);

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.MISSING_BODY);
  });

  // ── Email validation ─────────────────────────────────────────────────────

  it("returns 400 when email is invalid", async () => {
    const res = await handler(makeEvent({ email: "not-an-email", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(res.body);
    expect(body.message).toBe(HttpMessage.VALIDATION_ERROR);
    expect(body.errors).toBeDefined();
  });

  it("returns 400 when email is missing", async () => {
    const res = await handler(makeEvent({ password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  // ── Password validation ──────────────────────────────────────────────────

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await handler(makeEvent({ email: "user@example.com", password: "Ab1" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  it("returns 400 when password has no uppercase letter", async () => {
    const res = await handler(makeEvent({ email: "user@example.com", password: "mypass123" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  it("returns 400 when password has no number", async () => {
    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPassword" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  it("returns 400 when password is missing", async () => {
    const res = await handler(makeEvent({ email: "user@example.com" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  // ── Cognito error mapping ────────────────────────────────────────────────

  it("returns 400 when user already exists (UsernameExistsException)", async () => {
    const err = Object.assign(new Error("User already exists"), {
      name: "UsernameExistsException",
    });
    mockSignUpUser.mockRejectedValueOnce(err);

    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.USER_ALREADY_EXISTS);
  });

  it("returns 500 on unexpected service error", async () => {
    mockSignUpUser.mockRejectedValueOnce(new Error("Cognito unavailable"));

    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(res.body).message).toBe("Cognito unavailable");
  });

  it("returns 500 when COGNITO_CLIENT_ID env var is not set", async () => {
    delete process.env.COGNITO_CLIENT_ID;

    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(res.body).message).toContain("COGNITO_CLIENT_ID");
  });
});
