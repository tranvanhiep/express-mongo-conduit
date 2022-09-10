import { Document, model, Model, Schema, Types } from 'mongoose';
import { ProfileInfo, UserDocument } from './User';
import models from '@models/index';
import slug from 'slug';

export interface IArticle {
  slug: string;
  title: string;
  description?: string;
  body?: string;
  tagList?: Types.Array<string>;
  favoritesCount: number;
  author: Types.ObjectId;
  comments: Types.Array<Types.ObjectId>;
}

export interface ArticleContent {
  slug: string;
  title: string;
  description?: string;
  body?: string;
  tagList?: string[];
  favoritesCount: number;
  favorited: boolean;
  author: ProfileInfo;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleMethods {
  getArticle(user?: UserDocument): ArticleContent;
  generateSlug(): void;
  updateFavoriteCount(): Promise<void>;
}

export type ArticleModel = Model<IArticle, {}, ArticleMethods>;

export type ArticleDocument<T = {}> =
  | (Omit<
      Document<Types.ObjectId, {}, IArticle> & {
        _id: Types.ObjectId;
      } & IArticle &
        ArticleMethods,
      keyof T
    > &
      T)
  | null;

const ArticleSchema = new Schema<IArticle, ArticleModel, ArticleMethods>(
  {
    slug: {
      type: String,
      required: [true, "can't be blank"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "can't be blank"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    body: {
      type: String,
      trim: true,
    },
    tagList: [String],
    favoritesCount: {
      type: Number,
      default: 0,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  { timestamps: true }
);

ArticleSchema.pre(/^validate$/, function (next): void {
  if (!this.slug) {
    this.generateSlug();
  }

  next();
});

ArticleSchema.methods.generateSlug = function (): void {
  this.slug = slug(this.title);
};

ArticleSchema.methods.getArticle = function (
  user?: UserDocument
): ArticleContent {
  return {
    slug: this.slug,
    title: this.title,
    description: this.description,
    body: this.body,
    tagList: this.tagList,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    favoritesCount: this.favoritesCount,
    favorited: user ? user.isFavorite(this._id) : false,
    author: this.author.getProfileInfo(user),
  };
};

ArticleSchema.methods.updateFavoriteCount = async function (): Promise<void> {
  const count: number = await models.User.countDocuments({
    favorites: { $in: [this._id] },
  }).exec();

  this.favoritesCount = count;
  await this.save({ validateModifiedOnly: true });
};

const Article: ArticleModel = model<IArticle, ArticleModel>(
  'Article',
  ArticleSchema
);

export default Article;
