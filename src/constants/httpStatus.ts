export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export const HttpMessage = {
  MISSING_BODY: "Missing request body",
  VALIDATION_ERROR: "Validation failed",
  CREATED: "Ad created successfully",
  INTERNAL_SERVER_ERROR: "Internal server error",
} as const;
