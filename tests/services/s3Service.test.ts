jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PutObjectCommand: jest.fn()
}));

import { uploadImage } from '../../src/services/s3Service';

describe('s3Service', () => {
  it('uploads image and returns url', async () => {
    process.env.ADS_BUCKET = 'test-bucket';
    process.env.AWS_REGION = 'us-east-1';
    const url = await uploadImage('ad-1', Buffer.from('foo').toString('base64'));
    expect(url).toContain('test-bucket');
  });
});
