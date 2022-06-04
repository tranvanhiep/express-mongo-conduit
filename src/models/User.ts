import { Document, model, Model, Schema, Types } from 'mongoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import crypto from 'crypto';
import jwt, { Secret } from 'jsonwebtoken';

export interface IUser {
  username: string;
  email: string;
  bio?: string;
  image?: string;
  favorites?: Types.Array<Types.ObjectId>;
  following?: Types.Array<Types.ObjectId>;
  hash: string;
  salt: string;
}

export interface UserInfo {
  username: string;
  email: string;
  bio: string;
  image: string;
  token?: string;
}

export interface ProfileInfo {
  username: string;
  bio: string;
  image: string;
  following: boolean;
}

export interface IUserMethods {
  validPassword(password: string): boolean;
  setPassword(password: string): void;
  generateJwt(): string;
  getUserInfo(needToken?: boolean): UserInfo;
  getProfileInfo(currentUser?: UserDocument): ProfileInfo;
  isFavorite(articleId: string): boolean;
  favorite(articleId: Types.ObjectId): Promise<void>;
  unfavorite(articleId: Types.ObjectId): Promise<void>;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

export type UserDocument =
  | (Document<any, {}, IUser> & {
      _id: Types.ObjectId;
    } & IUser &
      IUserMethods)
  | null;

const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    username: {
      type: String,
      lowercase: true,
      unique: true,
      required: [true, "can't be blank"],
      match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
      index: true,
      trim: true,
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
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Article' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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
  const hash: string = crypto
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

UserSchema.methods.getUserInfo = function (
  needToken: boolean = false
): UserInfo {
  const userInfo: UserInfo = {
    username: this.username,
    email: this.email,
    bio: this.bio,
    image: this.image,
  };

  if (needToken) {
    return { ...userInfo, token: this.generateJwt() };
  }

  return userInfo;
};

UserSchema.methods.getProfileInfo = function (
  currentUser?: UserDocument
): ProfileInfo {
  return {
    username: this.username,
    bio: this.bio,
    image: this.image,
    following: !currentUser
      ? false
      : !!currentUser.following?.some(
          (followerId: Types.ObjectId): boolean =>
            followerId.toString() === this._id.toString()
        ),
  };
};

UserSchema.methods.isFavorite = function (articleId: string): boolean {
  return this.favorites.some(
    (id: Types.ObjectId) => id.toString() === articleId
  );
};

UserSchema.methods.favorite = async function (
  articleId: Types.ObjectId
): Promise<void> {
  if (this.favorites.includes(articleId)) {
    return;
  }

  this.favorites.push(articleId);
  await this.save();
};

UserSchema.methods.unfavorite = async function (
  articleId: Types.ObjectId
): Promise<void> {
  const idx: number = this.favorites.indexOf(articleId);

  if (idx < 0) {
    return;
  }

  this.favorites.splice(idx, 1);
  await this.save();
};

const User: UserModel = model<IUser, UserModel>('User', UserSchema);

export default User;
