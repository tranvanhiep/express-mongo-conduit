import { ProfileInfo, UserDocument } from '@models/User';
import { Document, Model, model, Schema, Types } from 'mongoose';

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
  getComment(user?: UserDocument): CommentContent;
}

export type CommentModel = Model<IComment, {}, CommentMethods>;

export type CommentDocument<T = {}> =
  | (Omit<
      Document<Types.ObjectId, {}, IComment> & {
        _id: Types.ObjectId;
      } & IComment &
        CommentMethods,
      keyof T
    > &
      T)
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

CommentSchema.methods.getComment = function (
  user?: UserDocument
): CommentContent {
  return {
    id: this._id,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    body: this.body,
    author: this.author.getProfileInfo(user),
  };
};

const Comment: CommentModel = model<IComment, CommentModel>(
  'Comment',
  CommentSchema
);

export default Comment;
