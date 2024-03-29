import 'dotenv/config';
import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import session, { SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';
import errorHandler from 'errorhandler';
import { connect, set } from 'mongoose';
import passport from 'passport';
import { localStrategy } from './middlewares/passport';
import routes from '@routes/routes';

interface CustomError extends Error {
  status: number;
}

interface ErrorResponse {
  errors: {
    message: string;
    error: Error;
  };
}

const isProd: boolean = process.env.NODE_ENV === 'production';
const sessionOpt: SessionOptions = {
  secret: process.env.SESSION_SECRET as string,
  cookie: {
    maxAge: 60000,
    sameSite: 'lax',
    secure: true,
    httpOnly: true,
  },
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
};
const app: Express = express();

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(`${__dirname}/public`));
app.use(session(sessionOpt));

if (!isProd) {
  app.use(errorHandler());
}

if (!isProd) {
  set('debug', true);
}

passport.use(localStrategy);
app.use(passport.initialize());
app.use(routes);

app.use((_req: Request, _res: Response, next: NextFunction): void => {
  const error: Partial<CustomError> = new Error('Not found');
  error.status = 400;

  next(error);
});

if (!isProd) {
  app.use(
    (
      err: CustomError,
      _req: Request,
      res: Response,
      _next: NextFunction
    ): void => {
      console.error(err?.stack);

      res.status(err?.status ?? 500);

      res.json({
        errors: {
          message: err?.message,
          error: err,
        },
      } as ErrorResponse);
    }
  );
}

app.use(
  (
    err: CustomError,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    res.status(err?.status ?? 500);
    res.json({
      errors: {
        message: err?.message,
        error: {},
      },
    } as ErrorResponse);
  }
);

connect(process.env.MONGODB_URI as string, {
  user: process.env.DB_USER,
  pass: process.env.DB_PASSWORD,
})
  .then(() => {
    app.listen(process.env.PORT, (): void => {
      console.log(`Listening on port ${process.env.PORT}`);
    });
  })
  .catch(console.error);
