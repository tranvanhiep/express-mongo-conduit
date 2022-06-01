import { Request } from 'express';
import { expressjwt, TokenGetter } from 'express-jwt';
import { Secret } from 'jsonwebtoken';

export interface AuthPayload {
  id: string;
  username: string;
}

const getToken: TokenGetter = (req: Request): string | undefined => {
  const authorization: string[] = req.headers?.authorization?.split(' ') ?? [];

  if (authorization.length && authorization[0] === 'Bearer') {
    return authorization[1];
  }

  return undefined;
};

export const auth = {
  required: expressjwt({
    secret: process.env.JWT_SECRET as Secret,
    algorithms: ['HS256'],
    requestProperty: 'auth',
    getToken,
  }),
  optional: expressjwt({
    secret: process.env.JWT_SECRET as Secret,
    algorithms: ['HS256'],
    credentialsRequired: false,
    requestProperty: 'auth',
    getToken,
  }),
};
