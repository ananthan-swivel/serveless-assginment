import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { AdRecord } from "../types";

const client = new SNSClient({});

export async function publishAdCreated(ad: AdRecord): Promise<void> {
  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) throw new Error("SNS_TOPIC_ARN env var not set");

  const payload = {
    subject: "AdCreated",
    message: JSON.stringify(ad),
  };

  await client.send(new PublishCommand({
    TopicArn: topicArn,
    Subject: payload.subject,
    Message: payload.message,
  }));
}
