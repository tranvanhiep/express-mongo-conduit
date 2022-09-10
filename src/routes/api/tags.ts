import models from '@models/index';
import { NextFunction, Request, Response, Router } from 'express';

const tags: Router = Router();

tags.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tagList = await models.Article.find().distinct('tagList').exec();
      res.json({ tags: tagList });
    } catch (error) {
      next(error);
    }
  }
);

export default tags;
