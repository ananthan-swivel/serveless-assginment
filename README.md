# Ads API — Serverless demo

This project is a small AWS Serverless service implemented in Node.js + TypeScript. It exposes a protected POST /ads endpoint which creates an ad, stores it in DynamoDB, optionally uploads an image to S3, and publishes an SNS notification.

Quick facts
- Language: TypeScript (Node.js)
- Infrastructure: AWS SAM (template.yaml)
- Tests: Jest (ts-jest)

Local development
1. Install dependencies

```bash
npm ci
```

2. Build

```bash
npm run build
```

3. Run tests

```bash
npm test
```

Notes
- Cognito authorizer is declared in SAM in the spec but for local testing you can mock JWTs when calling the API using `sam local`.
