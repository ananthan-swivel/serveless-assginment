import { handler } from "../../src/handlers/login";
import { HttpStatus, HttpMessage } from "../../src/constants/httpStatus";

jest.mock("../../src/services/cognitoService", () => ({
  loginUser: jest.fn(),
}));

import { loginUser } from "../../src/services/cognitoService";

const mockLoginUser = loginUser as jest.Mock;

const MOCK_TOKENS = {
  idToken: "id-token-value",
  accessToken: "access-token-value",
  refreshToken: "refresh-token-value",
};

function makeEvent(body: unknown): any {
  return {
    body: JSON.stringify(body),
    requestContext: { requestId: "req-login-test" },
  };
}

describe("login handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COGNITO_CLIENT_ID = "test-client-id";
  });

  // ── Happy path ───────────────────────────────────────────────────────────

  it("returns 200 with tokens on successful login", async () => {
    mockLoginUser.mockResolvedValue(MOCK_TOKENS);

    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(res.body);
    expect(body.idToken).toBe(MOCK_TOKENS.idToken);
    expect(body.accessToken).toBe(MOCK_TOKENS.accessToken);
    expect(body.refreshToken).toBe(MOCK_TOKENS.refreshToken);
    expect(mockLoginUser).toHaveBeenCalledWith(
      "user@example.com",
      "MyPass123",
      "test-client-id",
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
    const res = await handler(makeEvent({ email: "not-an-email", password: "pass" }));

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

  it("returns 400 when password is empty", async () => {
    const res = await handler(makeEvent({ email: "user@example.com", password: "" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  it("returns 400 when password is missing", async () => {
    const res = await handler(makeEvent({ email: "user@example.com" }));

    expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.VALIDATION_ERROR);
  });

  // ── Cognito error mapping ────────────────────────────────────────────────

  it("returns 401 when credentials are invalid (NotAuthorizedException)", async () => {
    const err = Object.assign(new Error("Incorrect username or password"), {
      name: "NotAuthorizedException",
    });
    mockLoginUser.mockRejectedValueOnce(err);

    const res = await handler(makeEvent({ email: "user@example.com", password: "WrongPass1" }));

    expect(res.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.INVALID_CREDENTIALS);
  });

  it("returns 403 when user is not confirmed (UserNotConfirmedException)", async () => {
    const err = Object.assign(new Error("User is not confirmed"), {
      name: "UserNotConfirmedException",
    });
    mockLoginUser.mockRejectedValueOnce(err);

    const res = await handler(makeEvent({ email: "user@example.com", password: "MyPass123" }));

    expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(JSON.parse(res.body).message).toBe(HttpMessage.USER_NOT_CONFIRMED);
  });

  it("returns 500 on unexpected service error", async () => {
    mockLoginUser.mockRejectedValueOnce(new Error("Cognito unavailable"));

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
