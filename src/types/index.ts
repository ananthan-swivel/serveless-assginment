// Input types derived from Zod schemas — single source of truth
export type { CreateAdInput } from "../validation/adSchema";
export type { SignupInput, LoginInput } from "../validation/authSchema";

export interface AdRecord {
  adId: string;
  userId: string;
  title: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse {
  statusCode: number;
  body: string;
}
