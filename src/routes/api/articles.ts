import { authorization, AuthPayload } from '@middlewares/auth';
import { ArticleDocument } from '@models/Article';
import models from '@models/index';
import { NextFunction, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';

interface ArticleRequest<T = {}> extends JwtRequest<T> {
  article?: ArticleDocument;
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
      const article = await models.Article.findOne({ slug }).exec();

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
      const user = await models.User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      const article = await models.Article.create(body.article);
      article.author = user._id;
      await article.save();
      res.json({ article: await article.getArticle(user) });
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
      let user;

      if (auth?.id) {
        user = await models.User.findById(auth.id).exec();
      }

      res.json({ article: await article!.getArticle(user) });
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
      const user = await models.User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      if (article?.author?.id !== auth?.id?.toString()) {
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

      await article!.save();
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
      const user = await models.User.findById(auth?.id).exec();

      if (!user) {
        res.sendStatus(401);

        return;
      }

      if (article?.author?.id !== auth?.id?.toString()) {
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
      const user = await models.User.findById(auth?.id).exec();

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
      const user = await models.User.findById(auth?.id).exec();

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

export default articles;
