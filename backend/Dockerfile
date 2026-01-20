FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖（包含 devDependencies，保证 TypeScript 等构建工具可用）
RUN npm install --include=dev

# 生成 Prisma 客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npm", "start"]
