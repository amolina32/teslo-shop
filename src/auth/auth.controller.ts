import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from './dto';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { ValidRoles } from './interfaces/valid-roles';
import { Auth } from './decorators/auth.decorator';
import { ResetPassword } from './interfaces/reset-passwort.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Get('check-auth-status')
  @Auth()
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }

  @Get('private')
  @Auth(ValidRoles.admin)
  testingPrivateRoute4(@GetUser() user: User) {
    return { message: 'This is a private route', user };
  }

  @Get('recovery-password/:email')
  recoveryPassword(@Param('email') email: string) {
    return this.authService.recoveryPassword(email);
  }

  @Patch('reset-password')
  changePassword(@Body() resetPassword: ResetPassword) {
    return this.authService.changePassword(resetPassword);
  }
}
