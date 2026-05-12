# 信息收集系统 — 部署文档

---

## 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | 20.x | 后端运行与前端构建 |
| Python | 3.11+ | Excel 导出服务 |
| SQLite | 3.x | 内嵌数据库，无需单独安装 |
| 操作系统 | Linux/macOS/Windows | 推荐使用 Linux 生产环境 |

---

## 目录与文件准备

部署前确保以下目录存在：

```bash
mkdir -p data/templates
mkdir -p data/exports/temp
mkdir -p logs
```

---

## 方式一：本地开发部署（三进程独立启动）

适合开发调试，三个服务分别启动。

### 1. 后端服务

```bash
cd backend
npm install
npm run build
```

启动命令：

```bash
DATABASE_PATH=./data/info-collection.db \
JWT_SECRET=$(openssl rand -hex 32) \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD_HASH=$(echo -n "your-password" | sha256sum | awk '{print $1}') \
PYTHON_SERVICE_URL=http://localhost:8000 \
PORT=3000 \
node dist/main.js
```

验证：访问 http://localhost:3000/api/health（如有健康检查接口）或直接访问前端页面

### 2. 前端开发服务器

```bash
cd frontend
npm install
npm run dev
```

开发服务器运行在 http://localhost:5173，通过 `vite.config.ts` 中的 proxy 配置自动代理 `/api` 到 localhost:3000

### 3. Python 导出服务

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

验证：访问 http://localhost:8000/health 返回 `{"status":"ok"}`

### 启动顺序
1. 先启动后端（端口 3000）
2. 再启动 Python 导出服务（端口 8000）
3. 最后启动前端开发服务器（端口 5173）

---

## 方式二：本地生产部署（前端静态文件 + 后端同端口）

适合本地演示或单机部署，前端构建为静态文件由 NestJS ServeStatic 托管。

### 1. 构建前端

```bash
cd frontend
npm install
npm run build
# 输出到 frontend/dist/
```

### 2. 构建后端

```bash
cd backend
npm install
npm run build
# 输出到 backend/dist/
```

### 3. 启动后端（自动托管前端静态文件）

```bash
cd backend
DATABASE_PATH=../data/info-collection.db \
JWT_SECRET=$(openssl rand -hex 32) \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD_HASH=$(echo -n "your-password" | sha256sum | awk '{print $1}') \
PYTHON_SERVICE_URL=http://localhost:8000 \
PORT=3000 \
node dist/main.js
```

NestJS 的 `ServeStaticModule` 会自动将 `frontend/dist` 挂载到根路径（排除 `/api*` 路径）。

### 4. 启动 Python 导出服务

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 访问
- 管理后台：http://localhost:3000
- API：http://localhost:3000/api
- Python 服务：http://localhost:8000

---

## 方式三：单容器 Docker 部署

适合生产环境一键部署，使用 Dockerfile 多阶段构建，supervisord 管理两个进程。

### 1. 构建镜像

```bash
docker compose build
```

### 2. 启动容器

```bash
mkdir -p data logs
docker compose up -d
```

### 3. 查看日志

```bash
docker compose logs -f
# 或进入容器查看
docker exec -it xinxi-app-1 tail -f /app/logs/nestjs.log
```

### 4. 停止容器

```bash
docker compose down
```

### 数据持久化

容器内以下目录通过卷映射持久化到宿主机：

| 容器路径 | 宿主机路径 | 说明 |
|----------|------------|------|
| `/app/data` | `./data` | SQLite 数据库、上传的 Excel 模板、导出文件 |
| `/app/logs` | `./logs` | 应用日志 |

### 环境变量

在 `docker-compose.yml` 中配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | NestJS 监听端口 |
| `DATABASE_PATH` | `/app/data/info-collection.db` | SQLite 数据库文件路径 |
| `JWT_SECRET` | change-me-in-production | JWT 签名密钥，生产环境必须修改 |
| `ADMIN_USERNAME` | admin | 管理员登录账号 |
| `ADMIN_PASSWORD_HASH` | sha256 值 | 管理员密码 SHA256 哈希 |
| `PYTHON_SERVICE_URL` | http://localhost:8000 | Python 导出服务地址 |

### 生成密码哈希

```bash
# Linux/macOS
echo -n "your-password" | sha256sum | awk '{print $1}'

# Windows PowerShell
[BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash([Text.Encoding]::UTF8.GetBytes("your-password"))).Replace("-", "").ToLower()
```

---

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | NestJS 后端 | 业务 API + 静态文件托管 |
| 8000 | Python FastAPI | Excel 填充与 ZIP 打包（内部调用） |
| 5173 | Vite DevServer | 仅开发模式使用 |
| 80 | Docker 映射 | 宿主机 80 映射到容器内 3000 |

---

## 生产环境建议

1. **修改默认密码**：务必修改 `ADMIN_PASSWORD_HASH`，不要使用默认的 admin123
2. **修改 JWT 密钥**：将 `JWT_SECRET` 替换为强随机字符串
3. **HTTPS**：生产环境使用 Nginx 或 CDN 提供 HTTPS 终端
4. **备份数据**：定期备份 `./data/info-collection.db` 和 `./data/templates/`
5. **日志轮转**：配置宿主机的日志轮转策略，避免 `./logs/` 目录无限增长
6. **资源限制**：Docker 生产部署时设置内存和 CPU 限制

---

## 常见问题

### Q: 前端页面刷新后 404
**A**: 生产模式下 NestJS 的 `ServeStaticModule` 托管静态文件，React Router 的 BrowserRouter 需要后端配置 fallback。当前 `ServeStaticModule` 已自动处理，若仍出现 404，检查 `frontend/dist` 目录是否存在。

### Q: Excel 导出失败
**A**: 检查 Python 服务是否运行，以及 `PYTHON_SERVICE_URL` 是否配置正确。查看 `/app/logs/python.log` 中的错误信息。

### Q: 数据库文件权限错误
**A**: 确保 `./data` 目录对运行用户可写。Docker 模式下使用 root 用户运行，一般无此问题。

### Q: Token 链接失效
**A**: 每个 Token 只能使用一次。提交后状态变为 `filled`，再次访问返回 410。如需重新收集，请删除原 Token 并生成新链接。
