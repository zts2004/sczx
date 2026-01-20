import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { generateToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';

export class AuthController {
  // 用户注册
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, phone, realName, studentId } = req.body;

      // 验证必填字段
      if (!username || !email || !password) {
        throw new AppError('用户名、邮箱和密码为必填项', 400);
      }

      // 学号校验（可选，但如果提供则必须非空）
      if (studentId !== undefined) {
        if (typeof studentId !== 'string' || studentId.trim().length === 0) {
          throw new AppError('学号不能为空', 400);
        }
        if (studentId.trim().length > 50) {
          throw new AppError('学号长度不能超过50位', 400);
        }
      }

      // 验证密码强度
      if (password.length < 6) {
        throw new AppError('密码长度至少为6位', 400);
      }

      // 检查用户名/邮箱/学号是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email },
            ...(studentId ? [{ studentId: studentId.trim() }] : []),
          ],
        },
      });

      if (existingUser) {
        throw new AppError('用户名、邮箱或学号已存在', 400);
      }

      // 加密密码
      const hashedPassword = await hashPassword(password);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          phone: phone || null,
          realName: realName || null,
          studentId: studentId ? studentId.trim() : null,
          role: 'user',
          status: 'active',
        },
        select: {
          id: true,
          username: true,
          studentId: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // 生成Token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 用户登录
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      // 兼容：前端可能传 login（推荐）或 studentId（旧字段）
      const { login, studentId, password } = req.body;
      const identifier = (typeof login === 'string' && login.trim().length > 0)
        ? login.trim()
        : (typeof studentId === 'string' ? studentId.trim() : '');

      if (!identifier || !password) {
        throw new AppError('学号/手机号/邮箱 和密码为必填项', 400);
      }

      // 查找用户（支持 学号 / 手机号 / 邮箱 登录）
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { studentId: identifier },
            { phone: identifier },
            { email: identifier },
          ],
          status: 'active',
        },
      });

      if (!user) {
        throw new AppError('账号或密码错误', 401);
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('账号或密码错误', 401);
      }

      // 生成Token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            studentId: user.studentId,
            email: user.email,
            role: user.role,
            realName: user.realName,
            avatar: user.avatar,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取当前用户信息
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError('未认证', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          studentId: true,
          email: true,
          phone: true,
          realName: true,
          avatar: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
