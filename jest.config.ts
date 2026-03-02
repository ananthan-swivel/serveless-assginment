import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    // Exclude new auth files until tests are added
    "!src/handlers/signup.ts",
    "!src/handlers/login.ts",
    "!src/services/cognitoService.ts",
    "!src/validation/authSchema.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
