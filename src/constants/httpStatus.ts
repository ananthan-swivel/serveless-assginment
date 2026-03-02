export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export const HttpMessage = {
  MISSING_BODY: "Missing request body",
  VALIDATION_ERROR: "Validation failed",
  CREATED: "Ad created successfully",
  UNAUTHORIZED: "Unauthorized",
  INTERNAL_SERVER_ERROR: "Internal server error",
  USER_CREATED: "User registered successfully",
  USER_ALREADY_EXISTS: "An account with that email already exists",
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_CONFIRMED:
    "Account not confirmed — check your email for the verification link",
} as const;
