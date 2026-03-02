import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../utils/logger";
import { loginUser } from "../services/cognitoService";
import { LoginSchema } from "../validation/authSchema";
import { HttpStatus, HttpMessage } from "../constants/httpStatus";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = createLogger(requestId);

  try {
    if (!event.body) {
      logger.warn("Missing body");
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: JSON.stringify({ message: HttpMessage.MISSING_BODY }),
      };
    }

    const parsed = JSON.parse(event.body);
    const result = LoginSchema.safeParse(parsed);

    if (!result.success) {
      logger.warn("Validation failed", { errors: result.error.issues });
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: JSON.stringify({
          message: HttpMessage.VALIDATION_ERROR,
          errors: result.error.issues,
        }),
      };
    }

    const { email, password } = result.data;
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) throw new Error("COGNITO_CLIENT_ID env var not set");

    const tokens = await loginUser(email, password, clientId);

    logger.info("User logged in", { email });
    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(tokens),
    };
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === "NotAuthorizedException") {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        body: JSON.stringify({ message: HttpMessage.INVALID_CREDENTIALS }),
      };
    }
    if (name === "UserNotConfirmedException") {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        body: JSON.stringify({ message: HttpMessage.USER_NOT_CONFIRMED }),
      };
    }
    const message =
      err instanceof Error ? err.message : HttpMessage.INTERNAL_SERVER_ERROR;
    createLogger(event.requestContext?.requestId).error("Login error", {
      message,
    });
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message }),
    };
  }
};
