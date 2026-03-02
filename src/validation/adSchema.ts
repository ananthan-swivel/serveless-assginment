import { z } from "zod";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const DATA_URI_REGEX =
  /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+=*)$/;

export const CreateAdSchema = z.object({
  title: z
    .string({ error: "Title must be a string" })
    .trim()
    .min(1, "Title cannot be empty"),

  price: z
    .number({ error: "Price must be a number" })
    .positive("Price must be a positive number"),

  imageBase64: z
    .string()
    .refine((val) => DATA_URI_REGEX.test(val), {
      message: `Image must be a valid data URI with one of the supported formats: ${ALLOWED_MIME_TYPES.join(", ")}`,
    })
    .refine(
      (val) => {
        const match = val.match(DATA_URI_REGEX);
        if (!match) return false;
        const base64Payload = match[2];
        const decodedBytes = (base64Payload.length * 3) / 4;
        return decodedBytes <= MAX_IMAGE_BYTES;
      },
      { message: "Image must not exceed 5 MB" },
    )
    .optional(),
});

export type CreateAdInput = z.infer<typeof CreateAdSchema>;

/** Extracts the MIME type from a validated data URI (e.g. "image/png"). */
export function extractMimeType(dataUri: string): string {
  const match = dataUri.match(DATA_URI_REGEX);
  return match ? match[1] : "image/jpeg";
}

/** Strips the data URI prefix and returns the raw base64 payload. */
export function extractBase64Payload(dataUri: string): string {
  const match = dataUri.match(DATA_URI_REGEX);
  return match ? match[2] : dataUri;
}
