import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  appBaseUrl: process.env.AUTH0_BASE_URL ?? process.env.APP_BASE_URL,
});

export const getRefreshToken = async (): Promise<string | undefined> => {
  const session = await auth0.getSession();
  return session?.tokenSet?.refreshToken ?? undefined;
};
