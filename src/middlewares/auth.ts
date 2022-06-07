import { Request } from 'express';
import { expressjwt, TokenGetter } from 'express-jwt';
import { Secret } from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface AuthPayload {
  id: Types.ObjectId;
  username: string;
}

const getToken: TokenGetter = (req: Request): string | undefined => {
  const auth: string[] = req.headers?.authorization?.split(' ') ?? [];

  if (auth.length && auth[0] === 'Token') {
    return auth[1];
  }

  return undefined;
};

export const authorization = {
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
