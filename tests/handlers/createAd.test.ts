import { handler } from '../../src/handlers/createAd';

jest.mock('../../src/services/dynamoService', () => ({ putAd: jest.fn() }));
jest.mock('../../src/services/s3Service', () => ({ uploadImage: jest.fn().mockResolvedValue('https://bucket/ads/id.jpg') }));
jest.mock('../../src/services/snsService', () => ({ publishAdCreated: jest.fn() }));

describe('createAd handler', () => {
  it('returns 201 for valid input without image', async () => {
    const event: any = { body: JSON.stringify({ title: 'Test', price: 10 }), requestContext: { requestId: 'req-1' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.title).toBe('Test');
    expect(body.price).toBe(10);
  });

  it('returns 201 for valid input with image', async () => {
    const event: any = { body: JSON.stringify({ title: 'WithImage', price: 20, imageBase64: 'Zm9v' }), requestContext: { requestId: 'req-2' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.imageUrl).toBeDefined();
  });

  it('returns 400 for invalid input', async () => {
    const event: any = { body: JSON.stringify({ title: '', price: 'x' }), requestContext: { requestId: 'req-3' } };
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
  });
});
