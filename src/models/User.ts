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
  token: string;
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
  getUserInfo(): UserInfo;
  getProfileInfo(user?: UserDocument): ProfileInfo;
  isFollowing(userId: Types.ObjectId): boolean;
  follow(userId: Types.ObjectId): Promise<void>;
  unfollow(userId: Types.ObjectId): Promise<void>;
  isFavorite(articleId: Types.ObjectId): boolean;
  favorite(articleId: Types.ObjectId): Promise<void>;
  unfavorite(articleId: Types.ObjectId): Promise<void>;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

export type UserDocument =
  | (Document<Types.ObjectId, {}, IUser> & {
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
      match: [/^\w+$/, 'is invalid'],
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
    favorites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Article',
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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
  this.hash = crypto
    .pbkdf2Sync(password, this.salt, iterations, keylen, digest)
    .toString('hex');
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

UserSchema.methods.getUserInfo = function (): UserInfo {
  return {
    username: this.username,
    email: this.email,
    bio: this.bio,
    image: this.image,
    token: this.generateJwt(),
  };
};

UserSchema.methods.getProfileInfo = function (
  user?: UserDocument
): ProfileInfo {
  return {
    username: this.username,
    bio: this.bio,
    image: this.image,
    following: !user ? false : user.isFollowing(this._id),
  };
};

UserSchema.methods.isFollowing = function (userId: Types.ObjectId): boolean {
  return this.following.some(
    (following: Types.ObjectId) => following.toString() === userId.toString()
  );
};

UserSchema.methods.follow = async function (
  userId: Types.ObjectId
): Promise<void> {
  if (this.isFollowing(userId)) {
    return;
  }

  this.following.push(userId);
  await this.save({ validateModifiedOnly: true });
};

UserSchema.methods.unfollow = async function (
  userId: Types.ObjectId
): Promise<void> {
  if (!this.isFollowing(userId)) {
    return;
  }

  this.following.remove(userId);
  await this.save({ validateModifiedOnly: true });
};

UserSchema.methods.isFavorite = function (articleId: Types.ObjectId): boolean {
  return this.favorites.some(
    (favorite: Types.ObjectId) => favorite.toString() === articleId.toString()
  );
};

UserSchema.methods.favorite = async function (
  articleId: Types.ObjectId
): Promise<void> {
  if (this.isFavorite(articleId)) {
    return;
  }

  this.favorites.push(articleId);
  await this.save({ validateModifiedOnly: true });
};

UserSchema.methods.unfavorite = async function (
  articleId: Types.ObjectId
): Promise<void> {
  if (!this.isFavorite(articleId)) {
    return;
  }

  this.favorites.remove(articleId);
  await this.save({ validateModifiedOnly: true });
};

const User: UserModel = model<IUser, UserModel>('User', UserSchema);

export default User;
