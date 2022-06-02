import { authorization, AuthPayload } from '@middlewares/auth';
import models from '@models/index';
import { NextFunction, Response, Router } from 'express';
import { Request as JwtRequest } from 'express-jwt';

const articles: Router = Router();

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

      const article = new models.Article(body.article);
      article.author = user._id;
      await article.save();
      res.json({ article: await article.getArticle(user) });
    } catch (error) {
      next(error);
    }
  }
);
