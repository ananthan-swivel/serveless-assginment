jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PublishCommand: jest.fn()
}));

import { publishAdCreated } from '../../src/services/snsService';

describe('snsService', () => {
  it('publishes ad created', async () => {
    process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123:topic';
    const ad = { adId: 'id', title: 't', price: 1, createdAt: new Date().toISOString() } as any;
    await expect(publishAdCreated(ad)).resolves.toBeUndefined();
  });
});
