# 信息收集系统

一个轻量级的信息收集与管理平台，支持管理员创建收集模板、上传 Excel 导出模板、生成一次性填写链接，填写人通过网页表单提交数据，管理员在后台查看、编辑记录并导出填充后的 Excel 文件。

---

## 功能特性

### 管理员后台
- **模板管理**：创建、编辑、删除信息收集模板
- **字段配置**：支持 6 种字段类型（文本、数字、日期、单选、多选、评分），可拖拽排序
- **Excel 模板**：上传 `.xlsx` 文件，在可视化表格中标记字段对应的单元格位置
- **自动字段提取**：上传 Excel 后自动识别 A 列文本作为字段候选，一键创建
- **Token 管理**：单条生成唯一填写链接，每个链接只能使用一次
- **记录管理**：查看填写记录列表、详情、编辑数据、删除记录
- **数据导出**：支持单人导出 Excel、批量选中导出 ZIP 压缩包

### 公开填写页
- 通过一次性 Token 链接访问，无需登录
- 根据模板字段动态渲染表单
- 提交后链接立即失效，显示"填写成功"

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + TypeScript + Ant Design 5 |
| 后端 | NestJS 10 + TypeORM + SQLite |
| 导出服务 | Python 3.11 + FastAPI + openpyxl |
| 部署 | Docker + supervisord（单容器） |

---

## 项目结构

```
xinxi/
├── backend/              # NestJS 后端
│   ├── src/
│   │   ├── auth/         # JWT 登录认证
│   │   ├── collection/   # 模板、字段、Token CRUD
│   │   ├── export/       # Excel 导出接口
│   │   ├── fill/         # 公开填写 API
│   │   ├── record/       # 记录管理
│   │   └── common/       # Guards、装饰器
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # React 前端
│   ├── src/
│   │   ├── components/   # Layout 布局
│   │   ├── pages/        # 页面组件
│   │   └── services/     # API 封装
│   ├── package.json
│   └── vite.config.ts
├── ai-service/           # Python FastAPI 导出服务
│   ├── main.py
│   └── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── supervisord.conf
```

---

## 快速开始

### 环境要求
- Node.js 20+
- Python 3.11+
- npm 或 yarn

### 1. 克隆项目
```bash
cd xinxi
```

### 2. 启动后端
```bash
cd backend
npm install
npm run build
DATABASE_PATH=./data/info-collection.db \
JWT_SECRET=your-jwt-secret \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD_HASH=$(echo -n "admin123" | sha256sum | awk '{print $1}') \
PYTHON_SERVICE_URL=http://localhost:8000 \
node dist/main.js
```
后端运行在 http://localhost:3000

### 3. 启动前端（开发模式）
```bash
cd frontend
npm install
npm run dev
```
前端开发服务器运行在 http://localhost:5173，API 请求通过 Vite 代理到 localhost:3000

### 4. 启动 Python 导出服务
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
导出服务运行在 http://localhost:8000

---

## 使用流程

### 首次使用
1. 访问 http://localhost:5173/login
2. 使用管理员账号登录（默认：admin / admin123）
3. 进入"模板管理" → 点击"新建模板"
4. 输入模板标题和描述

### 配置模板
1. 在"基础信息与字段"Tab 中添加字段（如：姓名、年龄、评分）
2. 切换到"Excel 模板"Tab，上传 `.xlsx` 文件
3. 在表格预览中点击单元格，选择对应字段进行映射
4. 保存映射配置

### 生成填写链接
1. 切换到"填写链接"Tab
2. 点击"生成填写链接"
3. 复制弹出的链接发送给填写人

### 查看记录与导出
1. 填写人提交后，进入"记录管理"
2. 查看记录详情，必要时编辑数据
3. 单条点击"导出"，或批量勾选后点击"批量导出 ZIP"

---

## 字段类型说明

| 类型 | 前端组件 | 校验规则 |
|------|----------|----------|
| text | Input | 必填校验 |
| number | InputNumber | 必须为数字 |
| date | DatePicker | 必须为有效日期 |
| select | Select | 必须在预设选项中 |
| multi_select | Checkbox.Group | 每项必须在预设选项中 |
| rating | Rate | 1~max 星 |

---

## 安全说明

- Token 使用 UUID v4，暴力猜测不可行
- 每个 Token 只能填写一次，提交后立即失效
- 管理接口使用 JWT 认证，全局 Guard 保护
- 公开填写接口仅验证 Token 有效性
- 密码使用 SHA256 哈希存储（生产环境建议使用 bcrypt）
- Excel 文件上传限制 `.xlsx` 格式，大小限制 10MB

---

