// CreateAdInput is derived from the Zod schema — single source of truth
export type { CreateAdInput } from "../validation/adSchema";

export interface AdRecord {
  adId: string;
  title: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
}

export interface ApiResponse {
  statusCode: number;
  body: string;
}
