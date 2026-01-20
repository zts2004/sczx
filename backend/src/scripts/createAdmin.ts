import dotenv from 'dotenv';
import prisma from '../utils/prisma';
import { hashPassword } from '../utils/bcrypt';

dotenv.config();

type Role = 'admin' | 'super_admin';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return v.trim();
}

async function main() {
  const role = (process.env.ADMIN_ROLE || 'admin').trim() as Role;
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('ADMIN_ROLE 只能是 admin 或 super_admin');
  }

  const username = required('ADMIN_USERNAME');
  const email = required('ADMIN_EMAIL');
  const password = required('ADMIN_PASSWORD');
  const studentId = (process.env.ADMIN_STUDENT_ID || '').trim() || null;
  const realName = (process.env.ADMIN_REALNAME || '').trim() || null;

  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD 长度至少 6 位');
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
        ...(studentId ? [{ studentId }] : []),
      ],
    },
    select: { id: true, username: true, email: true, studentId: true, role: true },
  });

  if (existing) {
    // 已存在则直接提升角色（更适合初始化/重跑脚本）
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role, status: 'active' },
      select: { id: true, username: true, email: true, studentId: true, role: true },
    });
    // eslint-disable-next-line no-console
    console.log('已存在用户，已更新角色：', updated);
    return;
  }

  const hashed = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      username,
      email,
      password: hashed,
      studentId,
      realName,
      role,
      status: 'active',
    },
    select: { id: true, username: true, email: true, studentId: true, role: true },
  });

  // eslint-disable-next-line no-console
  console.log('已创建管理员账号：', created);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

