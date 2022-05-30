import { model, Model, Schema, Types } from 'mongoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import crypto from 'crypto';
import jwt, { Secret } from 'jsonwebtoken';

export interface IUser {
  username: string;
  email: string;
  bio?: string;
  image?: string;
  favorites?: any[];
  following?: Types.DocumentArray<IUser>;
  hash: string;
  salt: string;
}

export interface IUserMethods {
  validPassword(password: string): boolean;
  setPassword(password: string): void;
  generateJwt(): string;
  generateAuthToken(): AuthUser;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

export interface AuthUser {
  username: string;
  email: string;
  token: string;
}

const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    username: {
      type: String,
      lowercase: true,
      unique: true,
      required: [true, "can't be blank"],
      match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      required: [true, "can't be blank"],
      match: [/\S+@\S+\.\S+/, 'is invalid'],
      index: true,
    },
    bio: String,
    image: String,
    favorites: [{ type: Types.ObjectId, ref: 'Article' }],
    following: [{ type: Types.ObjectId, ref: 'User' }],
    hash: String,
    salt: String,
  },
  { timestamps: true }
);

UserSchema.plugin(mongooseUniqueValidator, { message: 'is already taken' });

const iterations: number = 10000;
const keylen: number = 512;
const digest: string = 'sha512';

UserSchema.methods.validPassword = function (password: string): boolean {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, iterations, keylen, digest)
    .toString('hex');

  return this.hash === hash;
};

UserSchema.methods.setPassword = function (password: string): void {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(
    password,
    this.salt,
    iterations,
    keylen,
    digest
  );
};

UserSchema.methods.generateJwt = function (): string {
  return jwt.sign(
    {
      id: this._id,
      username: this.username,
    },
    process.env.JWT_SECRET as Secret,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
};

UserSchema.methods.generateAuthToken = function (): AuthUser {
  return {
    username: this.username,
    email: this.email,
    token: this.generateJwt(),
  };
};

model<IUser, UserModel>('User', UserSchema);
