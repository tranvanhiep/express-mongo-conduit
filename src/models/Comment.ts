import { Document, Model, model, Schema, Types } from 'mongoose';
import models from '@models/index';
import { ProfileInfo, UserDocument } from './User';

export interface IComment {
  body: string;
  author: Types.ObjectId;
  article: Types.ObjectId;
}

export interface CommentContent {
  id: string;
  createdAt: string;
  updatedAt: string;
  body: string;
  author: ProfileInfo;
}

export interface CommentMethods {
  getComment(user?: UserDocument): Promise<CommentContent>;
}

export type CommentModel = Model<IComment, {}, CommentMethods>;

export type CommentDocument =
  | (Document<Types.ObjectId, {}, IComment> & {
      _id: Types.ObjectId;
    } & IComment &
      CommentMethods)
  | null;

const CommentSchema = new Schema<IComment, CommentModel, CommentMethods>(
  {
    body: {
      type: String,
      required: [true, "can't be blank"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    article: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
    },
  },
  { timestamps: true }
);

CommentSchema.methods.getComment = async function (
  user?: UserDocument
): Promise<CommentContent> {
  const author = await models.User.findById(this.author).exec();

  return {
    id: this._id,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    body: this.body,
    author: author?.getProfileInfo(user) as ProfileInfo,
  };
};

const Comment: CommentModel = model<IComment, CommentModel>(
  'Comment',
  CommentSchema
);

export default Comment;
