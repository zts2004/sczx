import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';

export class UserController {
  // 获取个人信息
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

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
          updatedAt: true,
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

  // 更新个人信息
  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { phone, realName, avatar, studentId } = req.body;

      if (studentId !== undefined) {
        if (typeof studentId !== 'string' || studentId.trim().length === 0) {
          throw new AppError('学号不能为空', 400);
        }
        if (studentId.trim().length > 50) {
          throw new AppError('学号长度不能超过50位', 400);
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          phone: phone !== undefined ? phone : undefined,
          realName: realName !== undefined ? realName : undefined,
          avatar: avatar !== undefined ? avatar : undefined,
          studentId: studentId !== undefined ? studentId.trim() : undefined,
        },
        select: {
          id: true,
          username: true,
          studentId: true,
          email: true,
          phone: true,
          realName: true,
          avatar: true,
          role: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: '个人信息更新成功',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // 修改密码
  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        throw new AppError('旧密码和新密码为必填项', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('新密码长度至少为6位', 400);
      }

      // 获取用户
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      // 验证旧密码
      const isPasswordValid = await comparePassword(oldPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError('旧密码错误', 400);
      }

      // 加密新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error) {
      next(error);
    }
  }
}
