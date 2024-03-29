import { authorization, AuthPayload } from '@middlewares/auth';
import Article, { ArticleDocument } from '@models/Article';
import Comment, { CommentDocument } from '@models/Comment';
import User, { UserDocument } from '@models/User';
import { NextFunction, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';

interface ArticleRequest<T = any> extends JwtRequest<T> {
  article?: ArticleDocument<{ author: UserDocument }>;
  comment?: CommentDocument<{ author: UserDocument }>;
}

const articles: Router = Router();

articles.param(
  'slug',
  async (
    req: ArticleRequest,
    res: Response,
    next: NextFunction,
    slug: string
  ): Promise<void> => {
    try {
      const article = await Article.findOne<ArticleDocument>({ slug })
        .populate<{ author: UserDocument }>({ path: 'author' })
        .exec();

      if (!article) {
        res.sendStatus(404);

        return;
      }

      req.article = article;
      next();
    } catch (error) {
      next(error);
    }
  }
);

articles.param(
  'commentId',
  async (
    req: ArticleRequest,
    res: Response,
    next: NextFunction,
    id: string
  ): Promise<void> => {
    try {
      const comment = await Comment.findById<CommentDocument>(id)
        .populate<{ author: UserDocument }>({ path: 'author' })
        .exec();

      if (!comment) {
        res.sendStatus(403);

        return;
      }

      req.comment = comment;
      next();
    } catch (error) {
      next(error);
    }
  }
);

articles.get(
  '/',
  authorization.optional,
  async (
    req: JwtRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { auth, query: queryParams } = req;
      const { tag, author, favorited, limit, offset } = queryParams;
      const limitNo: number = !limit ? 20 : Number(limit);
      const offsetNo: number = !offset ? 0 : Number(offset);
      const authorDoc = await User.findOne({ username: author }).exec();
      const favoriterDoc = await User.findOne({
        username: favorited,
      }).exec();
      const query: any = {};

      if (authorDoc) {
        query.author = authorDoc._id;
      }

      if (favoriterDoc) {
        query._id = { $in: favoriterDoc.favorites };
      }

      if (tag) {
        query.tagList = { $in: [tag] };
      }

      const articlesDoc = await Article.find(query)
        .limit(limitNo)
        .skip(offsetNo)
        .sort({ createdAt: 'desc' })
        .populate({ path: 'author' })
        .exec();
      const articlesCount = await Article.countDocuments(query).exec();
      const user = await User.findById(auth?.id).exec();

      res.json({
        articles: articlesDoc.map((article) => article.getArticle(user)),
        articlesCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

articles.get(
  '/feed',
  authorization.required,
  async (
    req: JwtRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { auth, query: queryParams } = req;
      const { limit, offset } = queryParams;
      const limitNo: number = !limit ? 20 : Number(limit);
      const offsetNo: number = !offset ? 0 : Number(offset);
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const query: any = {
        author: { $in: user.following },
      };
      const articlesDoc = await Article.find(query)
        .limit(limitNo)
        .skip(offsetNo)
        .populate({ path: 'author' })
        .sort({ createdAt: 'desc' })
        .exec();
      const articlesCount = await Article.countDocuments(query).exec();

      res.json({
        articles: articlesDoc.map((article) => article.getArticle(user)),
        articlesCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

articles.post(
  '/',
  authorization.required,
  async (
    req: JwtRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { auth, body } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const article = await Article.create(body.article);

      article.author = user._id;
      await article.save();
      await article.populate({ path: 'author' });
      res.json({ article: article.getArticle(user) });
    } catch (error) {
      next(error);
    }
  }
);

articles.get(
  '/:slug',
  authorization.optional,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { auth, article } = req;
      const user = await User.findById(auth?.id).exec();

      res.json({ article: article!.getArticle(user) });
    } catch (error) {
      next(error);
    }
  }
);

articles.put(
  '/:slug',
  authorization.required,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { article, auth, body } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      if (article!.author?.id !== auth?.id) {
        res.sendStatus(403);

        return;
      }

      if (!body?.article) {
        res.sendStatus(403);

        return;
      }

      const { title, description, body: articleBody } = body.article;

      if (title !== undefined) {
        article!.title = title;
      }

      if (description !== undefined) {
        article!.description = description;
      }

      if (articleBody !== undefined) {
        article!.body = articleBody;
      }

      await article!.save({ validateModifiedOnly: true });
      res.json({ article: article!.getArticle(user) });
    } catch (error) {
      next(error);
    }
  }
);

articles.delete(
  '/:slug',
  authorization.required,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { article, auth } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      if (article!.author?.id !== auth?.id) {
        res.sendStatus(403);

        return;
      }

      article!.deleteOne();
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  }
);

articles.post(
  '/:slug/favorite',
  authorization.required,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { article, auth } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      await user.favorite(article!.id);
      await article!.updateFavoriteCount();
      res.json({ article: article!.getArticle(user) });
    } catch (error) {
      next(error);
    }
  }
);

articles.delete(
  '/:slug/favorite',
  authorization.required,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { article, auth } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      await user.unfavorite(article!.id);
      await article!.updateFavoriteCount();
      res.json({ article: article!.getArticle(user) });
    } catch (error) {
      next(error);
    }
  }
);

articles.get(
  '/:slug/comments',
  authorization.optional,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { article, auth } = req;
      const user = await User.findById(auth?.id).exec();
      const populatedArticle:
        | Omit<ArticleDocument, 'comments'> & {
            comments: CommentDocument[];
          } = await article!.populate({
        path: 'comments',
        populate: { path: 'author' },
        options: {
          sort: {
            createdAt: 'desc',
          },
        },
      });

      res.json({
        comments: populatedArticle.comments.map((comment) =>
          comment?.getComment(user)
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

articles.post(
  '/:slug/comments',
  authorization.required,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { article, auth, body } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const comment = await Comment.create({
        body: body?.comment?.body,
      });
      comment.article = article!._id;
      comment.author = user._id;

      await comment.save();
      article!.comments.push(comment._id);
      await article!.save();
      await comment.populate({ path: 'author' });
      res.json({ comment: comment.getComment(user) });
    } catch (error) {
      next(error);
    }
  }
);

articles.delete(
  '/:slug/comments/:commentId',
  authorization.required,
  async (
    req: ArticleRequest<AuthPayload>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { comment, article, auth } = req;
      const user = await User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      if (comment!.author?.id !== user.id) {
        res.sendStatus(403);

        return;
      }

      article?.comments.remove(comment!._id);
      await article?.save({ validateModifiedOnly: true });
      await comment!.remove();
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  }
);

export default articles;
