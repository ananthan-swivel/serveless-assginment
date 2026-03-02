import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { AdRecord } from "../types";

const client = new DynamoDBClient({});

export async function putAd(ad: AdRecord): Promise<void> {
  const table = process.env.ADS_TABLE;
  if (!table) throw new Error("ADS_TABLE env var not set");

  const params = {
    TableName: table,
    Item: marshall(ad),
  };

  await client.send(new PutItemCommand(params));
}
