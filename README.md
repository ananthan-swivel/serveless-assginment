# Ads API — Serverless Demo

A minimal AWS Serverless "Ads API" built with **Node.js + TypeScript**.  
Users can sign up, log in, and create ad records. On ad creation the service:

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

## Authentication flow

The API exposes two public endpoints for authentication. After login, use the `idToken` as a `Bearer` token to call protected routes.

```bash
# 1. Sign up (account is confirmed automatically — no email required)
curl -X POST https://<ApiUrl>/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "MyPass123"}'

# 2. Log in
curl -X POST https://<ApiUrl>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "MyPass123"}'
# → returns { "idToken": "...", "accessToken": "...", "refreshToken": "..." }

# 3. Call a protected endpoint
curl -X POST https://<ApiUrl>/ads \
  -H "Authorization: Bearer <idToken>" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Ad", "price": 99.99}'
```

---

## Local development with SAM

```bash
sam local start-api
```

For local testing, the Cognito authorizer is not enforced by SAM — pass any string as the `Authorization` header.

---

## Testing

```bash
npm test               # runs Jest with coverage
```

Coverage is collected in `coverage/lcov-report/index.html`.  
Thresholds: **80 % lines / statements / functions**, **70 % branches**.

The test suite covers all handlers (`signup`, `login`, `createAd`) and all services (`dynamoService`, `s3Service`, `snsService`, `cognitoService`) — 50 tests across 7 suites.

---

## API Reference

### `POST /auth/signup`

Registers a new user. No authentication required.

**URL**

```
POST https://<ApiUrl>/auth/signup
```

**Body**

```json
{
  "email": "user@example.com",
  "password": "MyPass123"
}
```

**Validation rules**

| Field      | Rules                                                      |
| ---------- | ---------------------------------------------------------- |
| `email`    | Required — must be a valid email address                   |
| `password` | Required — min 8 chars, at least one uppercase, one number |

**Responses**

| Status | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| 201    | User registered and confirmed — ready to log in          |
| 400    | Missing body, validation failure, or email already taken |
| 500    | Unexpected server error                                  |

**Example response**

```json
{
  "message": "User registered successfully"
}
```

---

### `POST /auth/login`

Authenticates an existing confirmed user and returns JWT tokens. No authentication required.

**URL**

```
POST https://<ApiUrl>/auth/login
```

**Body**

```json
{
  "email": "user@example.com",
  "password": "MyPass123"
}
```

**Responses**

| Status | Meaning                               |
| ------ | ------------------------------------- |
| 200    | Login successful — returns JWT tokens |
| 400    | Missing body or validation failure    |
| 401    | Invalid email or password             |
| 500    | Unexpected server error               |

**Example response**

```json
{
  "idToken": "<Cognito IdToken — use this as the Bearer token for /ads>",
  "accessToken": "<Cognito AccessToken>",
  "refreshToken": "<Cognito RefreshToken>"
}
```

---

### `POST /ads`

Creates an ad. Requires a valid Cognito `idToken` from the login response.

**URL**

```
POST https://<ApiUrl>/ads
```

**Headers**

```
Authorization: Bearer <idToken>
Content-Type: application/json
```

**Body**

```json
{
  "title": "Vintage Camera",
  "price": 149.99,
  "imageBase64": "data:image/jpeg;base64,<base64-payload>"
}
```

> `imageBase64` is optional. Supported formats: JPEG, PNG, WEBP, GIF. Max size: 5 MB. When provided, `imageUrl` in the response is a **pre-signed S3 URL** valid for 1 hour.

**Validation rules**

| Field         | Rules                                                          |
| ------------- | -------------------------------------------------------------- |
| `title`       | Required — non-empty string                                    |
| `price`       | Required — positive number                                     |
| `imageBase64` | Optional — valid data URI (`data:<mime>;base64,...`), max 5 MB |

**Responses**

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 201    | Ad created — returns the full `AdRecord` |
| 400    | Missing body or validation failure       |
| 401    | No valid Cognito JWT supplied            |
| 500    | Unexpected server error                  |

**Example response**

```json
{
  "adId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "cognito-sub-uuid",
  "title": "Vintage Camera",
  "price": 149.99,
  "createdAt": "2026-03-02T10:00:00.000Z"
}
```

---

## Project structure

```
src/
  constants/    HTTP status codes and messages
  handlers/     Lambda handlers (signup, login, createAd)
  services/     DynamoDB, S3, SNS, Cognito clients
  types/        Shared TypeScript types and interfaces
  utils/        Structured JSON logger
  validation/   Zod schemas (ads + auth)
tests/
  handlers/     Handler unit tests (signup, login, createAd)
  services/     Service unit tests (dynamo, s3, sns, cognito)
template.yaml   SAM IaC (Cognito, APIGW, Lambda, DynamoDB, S3, SNS)
.github/
  workflows/
    ci.yml      Build → Test → SAM deploy pipeline
```

---

## Known issues / limitations

- No `GET /ads` or `DELETE /ads` endpoints — create-only scope.
- No email verification — accounts are confirmed automatically on signup.
- No pagination.
- Images are validated client-side by byte estimate; actual decoded size may vary slightly.
- `sam local start-api` does not evaluate Cognito authorizers — use the deployed stack for end-to-end auth testing.
- S3 bucket is created without a bucket policy; add `BlockPublicAcls` etc. for production use.
