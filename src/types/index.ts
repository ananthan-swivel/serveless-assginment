export interface CreateAdInput {
  title: string;
  price: number;
  imageBase64?: string;
}

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
