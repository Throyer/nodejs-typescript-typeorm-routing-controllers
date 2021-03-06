import { Repository } from 'typeorm';

import { Service } from 'typedi';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

import { TOKEN_EXPIRATION, TOKEN_SECRET } from '@config/env';
import { HttpStatusError } from '@errors/HttpStatusError';
import { HttpStatus } from '@shared/web/HttpStatus';
import { User } from '@models/user';

import { InjectRepository } from 'typeorm-typedi-extensions';
import { AuthRequest, AuthResponse } from './types';

@Service()
export class AuthenticateUserService {
  @InjectRepository(User)
  repository: Repository<User>;

  async authenticate({ email, password }: AuthRequest): Promise<AuthResponse> {
    const user = await this.repository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      throw new HttpStatusError(
        HttpStatus.UNAUTHORIZED,
        'Email ou senha incorretos.',
      );
    }

    const match = await compare(password, user.password);

    if (!match) {
      throw new HttpStatusError(
        HttpStatus.UNAUTHORIZED,
        'Email ou senha incorretos.',
      );
    }

    const roles = user.roles.map(role => role.initials);

    const token = sign({ roles }, TOKEN_SECRET, {
      subject: user.id.toString(),
      expiresIn: TOKEN_EXPIRATION,
    });

    delete user.password;
    delete user.roles;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
      },
      token,
    };
  }
}
