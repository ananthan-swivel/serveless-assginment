import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { AdRecord } from "../types";
import { createLogger } from "../utils/logger";
import { putAd } from "../services/dynamoService";
import { uploadImage } from "../services/s3Service";
import { publishAdCreated } from "../services/snsService";
import { CreateAdSchema } from "../validation/adSchema";
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
    const result = CreateAdSchema.safeParse(parsed);

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

    const payload = result.data;
    const adId = uuidv4();
    let imageUrl: string | undefined;

    if (payload.imageBase64) {
      logger.info("Uploading image", { adId });
      imageUrl = await uploadImage(adId, payload.imageBase64);
    }

    const ad: AdRecord = {
      adId,
      title: payload.title,
      price: payload.price,
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    await putAd(ad);
    await publishAdCreated(ad);

    logger.info("Ad created", { adId });
    return { statusCode: HttpStatus.CREATED, body: JSON.stringify(ad) };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : HttpMessage.INTERNAL_SERVER_ERROR;
    const loggerErr = createLogger(event.requestContext?.requestId);
    loggerErr.error("Handler error", { message });
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message }),
    };
  }
};
