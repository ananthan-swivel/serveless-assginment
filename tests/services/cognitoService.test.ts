// Must be declared BEFORE jest.mock so the hoisted factory can close over it.
// Jest allows mock-prefixed variables to be referenced in factory functions.
const mockSend = jest.fn();

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  SignUpCommand: jest.fn().mockImplementation((args: unknown) => args),
  AdminConfirmSignUpCommand: jest
    .fn()
    .mockImplementation((args: unknown) => args),
  InitiateAuthCommand: jest.fn().mockImplementation((args: unknown) => args),
}));

import {
  signUpUser,
  adminConfirmUser,
  loginUser,
} from "../../src/services/cognitoService";

describe("cognitoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── signUpUser ───────────────────────────────────────────────────────────

  it("signUpUser resolves without throwing on success", async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(
      signUpUser("user@example.com", "MyPass123", "client-id"),
    ).resolves.toBeUndefined();
  });

  it("signUpUser propagates errors from Cognito", async () => {
    const err = Object.assign(new Error("User already exists"), {
      name: "UsernameExistsException",
    });
    mockSend.mockRejectedValueOnce(err);

    await expect(
      signUpUser("user@example.com", "MyPass123", "client-id"),
    ).rejects.toMatchObject({ name: "UsernameExistsException" });
  });

  // ── adminConfirmUser ─────────────────────────────────────────────────────

  it("adminConfirmUser resolves without throwing on success", async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(
      adminConfirmUser("user@example.com", "us-east-1_Pool"),
    ).resolves.toBeUndefined();
  });

  // ── loginUser ────────────────────────────────────────────────────────────

  it("loginUser returns tokens on successful authentication", async () => {
    mockSend.mockResolvedValueOnce({
      AuthenticationResult: {
        IdToken: "id-tok",
        AccessToken: "access-tok",
        RefreshToken: "refresh-tok",
      },
    });

    const tokens = await loginUser(
      "user@example.com",
      "MyPass123",
      "client-id",
    );

    expect(tokens).toEqual({
      idToken: "id-tok",
      accessToken: "access-tok",
      refreshToken: "refresh-tok",
    });
  });

  it("loginUser throws when AuthenticationResult is missing", async () => {
    mockSend.mockResolvedValueOnce({ AuthenticationResult: undefined });

    await expect(
      loginUser("user@example.com", "MyPass123", "client-id"),
    ).rejects.toThrow("Incomplete authentication result from Cognito");
  });

  it("loginUser throws when tokens are partially missing", async () => {
    mockSend.mockResolvedValueOnce({
      AuthenticationResult: { IdToken: "id-tok" }, // missing AccessToken + RefreshToken
    });

    await expect(
      loginUser("user@example.com", "MyPass123", "client-id"),
    ).rejects.toThrow("Incomplete authentication result from Cognito");
  });

  it("loginUser propagates NotAuthorizedException", async () => {
    const err = Object.assign(new Error("Incorrect username or password"), {
      name: "NotAuthorizedException",
    });
    mockSend.mockRejectedValueOnce(err);

    await expect(
      loginUser("user@example.com", "WrongPass1", "client-id"),
    ).rejects.toMatchObject({ name: "NotAuthorizedException" });
  });
});
