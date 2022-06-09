import models from '@models/index';
import { Strategy } from 'passport-local';

export const localStrategy: Strategy = new Strategy(
  {
    usernameField: 'user[email]',
    passwordField: 'user[password]',
  },
  async (email: string, password: string, done): Promise<void> => {
    try {
      const user = await models.User.findOne({ email }).exec();

      if (!user || !user.validPassword(password)) {
        return done(
          {
            message: 'email or password is invalid',
          },
          null
        );
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  }
);
