import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client();

export const getRefreshToken = async (): Promise<string | undefined> => {
  const session = await auth0.getSession();
  return session?.tokenSet?.refreshToken ?? undefined;
};
