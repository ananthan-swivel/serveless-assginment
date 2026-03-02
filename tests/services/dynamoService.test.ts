jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: jest
      .fn()
      .mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
    PutItemCommand: jest.fn(),
  };
});

import { putAd } from "../../src/services/dynamoService";

describe("dynamoService", () => {
  it("calls DynamoDB PutItem", async () => {
    process.env.ADS_TABLE = "AdsTable";
    const ad = {
      adId: "id",
      title: "t",
      price: 1,
      createdAt: new Date().toISOString(),
    } as any;

    await expect(putAd(ad)).resolves.toBeUndefined();
  });

  it("throws when ADS_TABLE is not set", async () => {
    delete process.env.ADS_TABLE;
    const ad = {
      adId: "id",
      title: "t",
      price: 1,
      createdAt: new Date().toISOString(),
    } as any;
    await expect(putAd(ad)).rejects.toThrow("ADS_TABLE env var not set");
  });
});
