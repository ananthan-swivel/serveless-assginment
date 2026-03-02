import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../utils/logger";
import { signUpUser, adminConfirmUser } from "../services/cognitoService";
import { SignupSchema } from "../validation/authSchema";
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
    const result = SignupSchema.safeParse(parsed);

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

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) throw new Error("USER_POOL_ID env var not set");

    await signUpUser(email, password, clientId);
    await adminConfirmUser(email, userPoolId);

    logger.info("User signed up and confirmed", { email });
    return {
      statusCode: HttpStatus.CREATED,
      body: JSON.stringify({ message: HttpMessage.USER_CREATED }),
    };
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === "UsernameExistsException") {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: JSON.stringify({ message: HttpMessage.USER_ALREADY_EXISTS }),
      };
    }
    const message =
      err instanceof Error ? err.message : HttpMessage.INTERNAL_SERVER_ERROR;
    createLogger(event.requestContext?.requestId).error("Signup error", {
      message,
    });
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message }),
    };
  }
};
