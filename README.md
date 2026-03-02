# Ads API — Serverless Demo

A minimal AWS Serverless "Ads API" built with **Node.js + TypeScript**.  
Authenticated users can create an ad record. On creation the service:

1. Validates input (title, price, optional base64 image) via **Zod**.
2. Stores the record in **Amazon DynamoDB**.
3. Optionally uploads an image to **Amazon S3**.
4. Publishes an `AdCreated` notification to **Amazon SNS**.
5. Enforces authentication via **Amazon Cognito** (JWT validated by API Gateway).

## Technologies

| Layer          | Technology                         |
| -------------- | ---------------------------------- |
| Runtime        | Node.js 20 + TypeScript 5          |
| Infrastructure | AWS SAM (`template.yaml`)          |
| Authentication | Amazon Cognito User Pool (JWT)     |
| Database       | Amazon DynamoDB                    |
| Object storage | Amazon S3                          |
| Messaging      | Amazon SNS                         |
| Validation     | Zod                                |
| Logging        | Structured JSON (requestId-scoped) |
| Tests          | Jest + ts-jest                     |
| CI             | GitHub Actions                     |

---

## Setup

### Prerequisites

- Node.js ≥ 20
- AWS CLI configured (`aws configure`)
- AWS SAM CLI (`brew install aws-sam-cli` / [docs](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))

### 1 — Clone & install

```bash
git clone <repo-url>
cd <repo-dir>
npm ci
```

### 2 — Build

```bash
npm run build   # compiles TypeScript → dist/
sam build       # packages the Lambda for deployment
```

### 3 — Deploy to AWS

```bash
sam deploy --guided
# Follow the prompts; stack name, region, etc. are saved to samconfig.toml
```

After deployment, SAM prints three outputs:

| Output             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `ApiUrl`           | `https://<id>.execute-api.<region>.amazonaws.com/dev` |
| `UserPoolId`       | Cognito User Pool ID                                  |
| `UserPoolClientId` | Cognito App Client ID (no secret)                     |

---

## Authentication — obtaining a JWT token

### Register a user

```bash
aws cognito-idp sign-up \
  --client-id <UserPoolClientId> \
  --username user@example.com \
  --password MyPass1234

aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <UserPoolId> \
  --username user@example.com
```

### Get a token

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <UserPoolClientId> \
  --auth-parameters USERNAME=user@example.com,PASSWORD=MyPass1234
```

Copy the `IdToken` from the response.

### Call the API

```bash
curl -X POST https://<ApiUrl>/ads \
  -H "Authorization: Bearer <IdToken>" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Ad", "price": 99.99}'
```

---

## Local development with SAM

```bash
sam local start-api
```

Pass any JWT (or a [mocked one](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-invoke.html)) in the `Authorization` header.  
For quick local testing without a real Cognito token, you can temporarily
disable the authorizer check in the handler (see `src/handlers/createAd.ts`).

---

## Testing

```bash
npm test               # runs Jest with coverage
```

Coverage is collected in `coverage/lcov-report/index.html`.  
Thresholds: **80 % lines / statements / functions**, **70 % branches**.

---

## API Reference

### `POST /ads`

**Headers**

```
Authorization: Bearer <Cognito IdToken>
Content-Type: application/json
```

**Body**

```json
{
  "title": "string (required, non-empty)",
  "price": "number (required, > 0)",
  "imageBase64": "data:<mime>;base64,<payload> (optional, ≤ 5 MB, JPEG/PNG/WEBP/GIF)"
}
```

**Responses**

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 201    | Ad created — returns the full `AdRecord` |
| 400    | Missing body or validation failure       |
| 401    | No valid Cognito JWT supplied            |
| 500    | Unexpected server error                  |

---

## Project structure

```
src/
  constants/    HTTP status codes and messages
  handlers/     Lambda handler (createAd.ts)
  services/     DynamoDB, S3, SNS clients
  types/        Shared TypeScript types
  utils/        Structured JSON logger
  validation/   Zod schema + base64 helpers
tests/
  handlers/     Handler unit tests
  services/     Service unit tests
template.yaml   SAM IaC (Cognito, APIGW, Lambda, DynamoDB, S3, SNS)
.github/
  workflows/
    ci.yml      Build → Test → SAM deploy pipeline
```

---

## Known issues / limitations

- No `GET /ads` or `DELETE /ads` endpoints — create-only scope.
- No pagination.
- Images are validated client-side by byte estimate; actual decoded size may vary slightly.
- `sam local start-api` does not evaluate Cognito authorizers — use the deployed stack for end-to-end auth testing.
- S3 bucket is created without a bucket policy; add `BlockPublicAcls` etc. for production use.
