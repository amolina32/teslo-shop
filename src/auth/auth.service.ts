import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { User } from './entities/user.entity';
import { LoginUserDto, CreateUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt.payload.interface';
import { ResetPassword } from './interfaces/reset-passwort.interface';
@Injectable()
export class AuthService {
  private logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createAuthDto: CreateUserDto) {
    try {
      createAuthDto.password = bcrypt.hashSync(createAuthDto.password, 10);

      const user = this.userRepository.create(createAuthDto);
      await this.userRepository.save(user);
      const { password: passwordDelete, isActive, ...userData } = user;
      return userData;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findOne({
      where: { email: email.toLocaleLowerCase() },
      select: { email: true, password: true, id: true, fullName: true },
    });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Credentials are not valid');
    }
    const { password: passwordDelete, id, ...userData } = user;
    return { ...userData, token: this.getJwtToken({ id: user.id }) };
  }

  checkAuthStatus(user: User) {
    const { password: passwordDelete, id, ...userData } = user;
    return { ...userData, token: this.getJwtToken({ id: user.id }) };
  }

  async recoveryPassword(userEmail: string) {
    const user = await this.userRepository.findOne({
      where: { email: userEmail.toLocaleLowerCase() },
    });

    if (!user) throw new NotFoundException('User not found');

    user.temporalTokenKey = bcrypt.hashSync(uuid(), 10);
    this.userRepository.save(user);

    return {
      url: this.jwtService.sign(
        { sub: user.id },
        { expiresIn: '1h', secret: user.temporalTokenKey },
      ),
    };
  }

  async changePassword(resetPassword: ResetPassword) {
    try {
      const { token, password: newPassword } = resetPassword;
      const { sub: id } = this.jwtService.decode(token);
      const user = await this.userRepository.findOne({
        where: { id },
      });

      if (!user) throw new NotFoundException('User not found');

      try {
        this.jwtService.verify(token, {
          secret: user.temporalTokenKey!,
        });
      } catch (error) {
        throw new BadRequestException('Invalid token');
      }

      user.password = bcrypt.hashSync(newPassword, 10);
      user.temporalTokenKey = null;
      this.userRepository.save(user);
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid token');
    }
  }

  private getJwtToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  private handleExceptions(error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.log(error);
    throw new InternalServerErrorException(
      'Unnespected error, please check server logs',
    );
  }
}
