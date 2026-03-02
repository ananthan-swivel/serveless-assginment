import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { CreateAdInput, AdRecord } from "../types";
import { createLogger } from "../utils/logger";
import { putAd } from "../services/dynamoService";
import { uploadImage } from "../services/s3Service";
import { publishAdCreated } from "../services/snsService";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const logger = createLogger(requestId);

  try {
    if (!event.body) {
      logger.warn("Missing body");
      return { statusCode: 400, body: JSON.stringify({ message: "Missing body" }) };
    }

    const payload = JSON.parse(event.body) as CreateAdInput;
    if (!payload.title || typeof payload.title !== "string") {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid title" }) };
    }
    if (payload.price == null || typeof payload.price !== "number") {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid price" }) };
    }

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
    return { statusCode: 201, body: JSON.stringify(ad) };
  } catch (err: any) {
    const message = err?.message || "Internal error";
    const loggerErr = createLogger(event.requestContext?.requestId);
    loggerErr.error("Handler error", { message });
    return { statusCode: 500, body: JSON.stringify({ message }) };
  }
};
