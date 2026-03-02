import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { AuthTokens } from "../types";

const client = new CognitoIdentityProviderClient({});

export async function signUpUser(
  email: string,
  password: string,
  clientId: string,
): Promise<void> {
  await client.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    }),
  );
}

export async function adminConfirmUser(
  email: string,
  userPoolId: string,
): Promise<void> {
  await client.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: email,
    }),
  );
}

export async function loginUser(
  email: string,
  password: string,
  clientId: string,
): Promise<AuthTokens> {
  const response = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );

  const auth = response.AuthenticationResult;
  if (!auth?.IdToken || !auth?.AccessToken || !auth?.RefreshToken) {
    throw new Error("Incomplete authentication result from Cognito");
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
  };
}
