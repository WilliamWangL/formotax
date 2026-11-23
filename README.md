# FormoTax — 在线税表生成工具

面向美国市场的在线税表填写工具。用户在浏览器中完成 W-9 / W-4 / W-8BEN / W-8BEN-E 引导式填写、在线签名，并在设备本地把数据写入 **IRS 官方 PDF** 的 AcroForm 字段后扁平化导出，税务数据与签名不上传服务器。商业模式为**填写免费、下载付费**：填写与预览不限次数且无需账号，下载已完成 PDF 时按次收费（默认 USD 1/份），一次付费在 24 小时内可重复下载同一份文档。

技术方案来源：`在线税表生成工具网站技术方案_V1.1.docx`（纯文本版 `doc.txt`）。

## 功能概览

- 四张 IRS 表单（配置化，含字段映射、条件显示、校验、选项组、签名位）
- 分步向导 + 实时校验 + 草稿续填（localStorage，不含签名）
- PDF.js 预览、pdf-lib 填充并 flatten、下载
- SEO 落地页（canonical、og/twitter 卡片、JSON-LD：Organization / WebSite / WebPage / SoftwareApplication / FAQPage / BreadcrumbList / ItemList / OfferCatalog）
- AI 友好层：`/llms.txt`、`/llms-full.txt`、`/api/ai/forms`、`/api/ai/forms/[slug]`、`/api/ai/forms/[slug]/markdown`、`/sitemap.xml`、`/robots.txt`、`/manifest.webmanifest`
- 账号体系（JWT access/refresh 轮换、登出撤销）、按次下载付费（PayPal 结算，唯一支付方式）
- 下载授权窗口：支付成功为 `userId + formCode` 开通 `DOWNLOAD_ACCESS_HOURS`，窗口内重复下载不再计费
- 管理后台 API（统计、用户、订单、版本发布）

## 目录结构

```
apps/
  web/                 Next.js 15 App Router 站点（SEO 页、向导、Dashboard）
  api/                 NestJS 11 API + Prisma（MySQL 8）+ Redis
packages/
  shared-types/        表单/API 的 TypeScript 契约
  validation/          Zod schema 生成器（按配置生成）
  tax-form-engine/     表单定义、步骤、字段绑定、选项组（单一事实来源）
  pdf-engine/          pdf-lib 填充、flatten、签名写入
  ui/                  共享 UI 组件
docker/                Dockerfile.web / Dockerfile.api / nginx.conf
scripts/               模板下载、表单字段检查、样例渲染
```

## 快速开始

### 方式一：Docker Compose（完整栈）

```bash
cp .env.example .env      # 按需修改端口、密钥、支付配置
docker compose up -d --build
docker compose exec api pnpm prisma:seed
```

访问 `http://localhost`（默认 `HTTP_PORT=80`）。栈内包含 mysql、redis、api、web、nginx；`api` 会在启动时自动执行 `prisma migrate deploy`，并将 `./storage` 挂载为本地模板存储目录（替代对象存储）。

### 方式二：本地开发

```bash
pnpm install
cp .env.example .env

# 只起数据服务（端口由 MYSQL_PORT / REDIS_PORT 控制）
docker compose up -d mysql redis

pnpm db:migrate          # prisma migrate deploy
pnpm db:seed             # 系统配置、四张表单版本、管理员账号

pnpm dev                 # web:3000 + api:4000
```

单独运行：

```bash
pnpm dev:web
pnpm dev:api
```

> API 启动与 Prisma CLI 都会自动加载仓库根目录的 `.env`；容器内直接使用注入的环境变量，已存在的变量优先。

### 生产域名与 TLS（formotax.ecommica.com）

服务器上以 `https://formotax.ecommica.com` 对外提供服务，容器只监听回环端口：

- `.env`：`PUBLIC_BASE_URL` / `WEB_URL` / `NEXT_PUBLIC_SITE_URL` 都是 `https://formotax.ecommica.com`，`NEXT_PUBLIC_API_URL=https://formotax.ecommica.com/api/v1`，`WEB_PORT=3004`，`API_PORT=8083`
- 容器层**不再运行 nginx**：web 发布 `127.0.0.1:3004`、api 发布 `127.0.0.1:8083`，由**宿主机 nginx** 终止 TLS 并按路径分流（`/api/ai/`、`/_next/`、`/templates/` 走 web，其余 `/api/` 走 api）
- 宿主机配置模板：`deploy/nginx/formotax.ecommica.com.conf`（首次签发证书前用 `formotax.ecommica.com.bootstrap.conf`）；流水线会把它同步到 `/opt/tax/deploy/nginx/`，安装进 `/etc/nginx/conf.d/` 需 root，见 `deploy/enable-tls.sh`
- 证书：`certbot certonly --webroot -w /var/www/letsencrypt -d formotax.ecommica.com`，安装完整配置后 `nginx -t && nginx -s reload`
- `NEXT_PUBLIC_*` 在构建期注入，域名变更后重新触发流水线即可（CI 会重建 web 镜像）

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 站点对外地址，用于 canonical / JSON-LD / sitemap |
| `NEXT_PUBLIC_API_URL` | 浏览器访问的 API 根地址（含 `/api/v1`） |
| `PORT` | API 监听端口，默认 4000 |
| `WEB_URL` | 后端重定向回前端的地址（支付回跳） |
| `DATABASE_URL` | MySQL 连接串 |
| `REDIS_URL` | Redis 连接串；不可用时自动降级（缓存/撤销列表 best-effort） |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_TTL` | 访问令牌密钥与有效期（秒） |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_TTL` | 刷新令牌密钥与有效期（秒） |
| `CORS_ORIGINS` | 允许的前端来源，逗号分隔 |
| `TEMPLATE_DIR` | 官方 PDF 模板目录，默认 `../web/public/templates`（相对 `apps/api`） |
| `STORAGE_DIR` | 服务器本地可写存储目录，默认 `./storage`；其中 `templates/` 下的文件优先于内置模板 |
| `DOWNLOAD_PRICE_USD` | 每份 PDF 的下载单价，默认 `1` |
| `DOWNLOAD_ACCESS_HOURS` | 付费后免费重复下载窗口（小时），默认 `24` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed 创建的后台账号 |
| `PAYPAL_MODE` / `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal REST 应用凭据（**必填**）；`sandbox` 走 `api-m.sandbox.paypal.com` |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook ID，用于 `verify-webhook-signature` 验签 |
| `PAYPAL_BRAND_NAME` / `PAYPAL_API_URL` | 结账页品牌名；可选 API 域名覆盖（代理场景） |
| `PUBLIC_BASE_URL` / `HTTP_PORT` / `WEB_PORT` / `API_PORT` / `MYSQL_*` / `REDIS_PORT` | Docker Compose 使用（本地栈用 `HTTP_PORT`，生产栈用 `WEB_PORT` / `API_PORT`） |

### 凭据放在 GitHub Actions（推荐）

真实凭据不入库，统一存在 **Settings → Secrets and variables → Actions**，由流水线在部署时渲染成服务器上的 `.env`（`deploy/render-env.sh`，权限 600，不回显值）。

**Secrets（敏感）**

| 名称 | 说明 |
| --- | --- |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal App 凭据，缺失时下单返回 `PAYMENT_NOT_CONFIGURED` |
| `PAYPAL_WEBHOOK_ID` | Webhook 验签 ID |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 用 `openssl rand -hex 32` 生成 |
| `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD` | 数据库口令 |
| `ADMIN_PASSWORD` | seed 出的后台账号口令 |
| `DEPLOY_SSH_KEY` | 部署用私钥（对应公钥写入服务器 `~/.ssh/authorized_keys`） |

**Variables（非敏感）**

| 名称 | 示例 |
| --- | --- |
| `PUBLIC_BASE_URL` | `https://formotax.ecommica.com` |
| `PAYPAL_MODE` | `live` 或 `sandbox`（未设置时流水线直接失败） |
| `PAYPAL_BRAND_NAME` | `FormoTax` |
| `DOWNLOAD_PRICE_USD` / `DOWNLOAD_ACCESS_HOURS` | `1` / `24` |
| `WEB_PORT` / `API_PORT` / `MYSQL_DATABASE` / `MYSQL_USER` / `ADMIN_EMAIL` | `3004` / `8083` / `tax_form` / `tax` / `admin@formotax.com` |
| `DEPLOY_HOST` / `DEPLOY_USER` | 服务器地址、SSH 用户（部署目录固定为 `/opt/tax`） |

**部署架构（与 fincode 一致）**

- CI 构建镜像并推送到 GHCR：`ghcr.io/williamwangl/formotax-api`、`ghcr.io/williamwangl/formotax-web`（同时打 `latest` 和 commit sha 两个 tag，后者用于回滚）。
- 服务器只 `docker compose -f docker-compose.prod.yml pull && up -d --wait`，**不 clone 源码、不装 Node、不本地构建**。
- 流水线每次 `scp`：`docker-compose.prod.yml`、`.env` 到 `/opt/tax`，并把 `deploy/nginx/` 同步到 `/opt/tax/deploy/nginx/` 供宿主机安装（安装进 `/etc/nginx/conf.d/` 需 root，属手工步骤）。
- MySQL / Redis 容器不变，卷名显式复用 `tax-form-generator_mysql-data` / `tax-form-generator_redis-data`，从旧 `docker-compose.yml` 切过来不会丢数据。

**配置步骤**

1. 仓库 → Settings → Secrets and variables → Actions，按上表分别添加 Secrets 和 Variables。
2. （可选但建议）Settings → Environments → 新建 `production`，把 Secrets 放到环境级并加必填审阅人；流水线已声明 `environment: production`。
3. 服务器准备：装好 Docker + Compose（需 v2.17+，用到 `--wait`），把部署公钥加入 `~/.ssh/authorized_keys`。部署目录 `/opt/tax` 由流水线自动创建，无需手工 clone 或预置文件。
4. 推送 `main` 或手动 Run workflow：`verify`（typecheck）→ `build-api` / `build-web` 推镜像到 GHCR → `deploy` 渲染 `.env` → `scp` 配置 → 服务器 `pull` + `up -d --wait`。

**注意**

- 服务器上的 `.env` 由流水线覆盖，**不要手工编辑**；临时调试可用 `bash deploy/render-env.sh --check` 只做校验。
- 首次部署会自动停掉旧的本地构建栈（`/root/workspace/tax` 下的 `docker-compose.yml`，命名卷保留，数据库不丢）；旧目录不存在时该步骤静默跳过。
- Fork 的 PR 拿不到 Secrets；日志中凭据会自动打码，但不要自己 `echo` 变量。
- 轮换：改完 PayPal 后台的 Secret 后更新同名 Actions Secret，重新 Run workflow 即生效。
- 若凭据曾提交进 git 历史，仅删除文件无效，需要重写历史，并立即在 PayPal 后台 Reset。

## 数据库

9 张表：`users`、`tax_forms`、`tax_form_versions`、`user_tax_forms`、`payment_orders`、`payment_transactions`、`usage_logs`、`system_configs`、`admin_users`。

- 迁移：`apps/api/prisma/migrations/0001_init`、`0002_payment_provider_session`、`0003_pay_per_download`（删除 `plans` / `subscriptions` / `user_usage_quotas`，`payment_orders` 增加 `form_code` 与 `access_expires_at`）
- 种子：`apps/api/prisma/seed.ts`（幂等 upsert；表单配置来自 `@tax/form-engine`，下载单价与窗口写入 `system_configs`）
- 主键为 BIGINT，API 序列化为字符串，避免 JS 精度丢失

付费履约在单个事务内完成：订单置为 `paid`、写入 `payment_transactions`、按 `paidAt + DOWNLOAD_ACCESS_HOURS` 设置 `access_expires_at`，并记录一条 `usage_logs(action='download')`。`GET /downloads/access` 以该时间窗为唯一权威判断，重复回调与重复 `capture` 均为幂等空操作。

## API 一览（前缀 `/api/v1`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 数据库/Redis/模板/支付方式健康状态（`paymentProvider: paypal`、`paypal: configured\|not_configured`） |
| GET | `/tax-forms` | 上架表单列表（Redis 缓存 300s） |
| GET | `/tax-forms/:code` | 详情（含版本） |
| GET | `/tax-forms/:code/config` | 字段/步骤/映射配置，支持 `?version=` |
| GET | `/tax-forms/:code/versions` | 版本列表 |
| GET | `/tax-forms/:code/template` | 官方 PDF：从服务器本地磁盘流式返回（`X-Template-Storage: bundled\|storage`） |
| POST | `/auth/register` `/auth/login` `/auth/refresh` `/auth/logout` | 认证；refresh 轮换、logout 撤销 jti |
| GET/PATCH/DELETE | `/users/me` | 资料、软删除账号 |
| GET/POST | `/user-tax-forms` | 用户表单元数据（仅文件名/表单号，不存税务数据） |
| GET | `/downloads/access?formCode=W9` | 当前用户对该表的下载授权：`active`、`orderNo`、`expiresAt`、`price`、`accessHours` |
| POST | `/downloads/checkout` | 创建按次下载订单（`{"formCode":"W9"}`），返回 `orderNo` 与 `checkoutUrl` |
| GET | `/downloads/orders` / `/downloads/orders/:orderNo` | 购买记录与订单详情 |
| POST | `/downloads/orders/:orderNo/capture` | PayPal 回跳后扣款：执行 capture 并以幂等方式履约 |
| POST | `/payments/webhook/paypal` | PayPal 回调，使用原始请求体做 `verify-webhook-signature` 验签 |
| POST | `/admin/auth/login` | 管理员登录（8h 令牌） |
| GET | `/admin/stats` `/admin/users` `/admin/orders` `/admin/usage` | 后台数据（下载付费统计、用户与订单） |
| PATCH | `/admin/users/:id` `/admin/tax-forms/:code/versions/:version` | 用户状态、版本发布 |

鉴权为全局守卫：默认要求 access token，`@Public()` 放行，`@AdminOnly()` 仅接受管理员令牌；管理员令牌不能调用普通用户接口，反之亦然。

### 支付回调（PayPal）

PayPal 是唯一支付方式，因此回调路由固定为 `POST /payments/webhook/paypal`，不再接受 `:provider` 参数。

- 必须携带 `paypal-auth-algo` / `paypal-cert-url` / `paypal-transmission-id` / `paypal-transmission-sig` / `paypal-transmission-time` 五个头，缺失或验签失败均返回 `400 INVALID_SIGNATURE`。
- 事件映射：`PAYMENT.CAPTURE.COMPLETED` → 履约；`PAYMENT.CAPTURE.DENIED` / `PAYMENT.CAPTURE.DECLINED` → 订单置 `failed`；其余事件忽略。
- 回调按订单号幂等：已支付订单重复回调不会重复开通授权窗口。

支付宝/微信/Stripe 等其它渠道未接入；`POST /downloads/checkout` 只有在 PayPal 凭据齐全时才创建订单，否则返回 `400 PAYMENT_NOT_CONFIGURED`。

### PayPal 支付流程

PayPal 使用 Orders v2（`intent=CAPTURE`）一次性付款，不依赖 SDK：

1. `POST /downloads/checkout` 创建本地订单（金额取自 `DOWNLOAD_PRICE_USD`，`form_code` 记录表单号），并调用 `POST /v2/checkout/orders`；`purchase_units[0].custom_id` 写入本地 `orderNo`，返回 `approve` 链接作为 `checkoutUrl`，同时把 PayPal order id 存入 `payment_orders.provider_session_id`。
2. 填写页在弹窗中打开 `checkoutUrl`，主页面每 2.5s 轮询 `GET /downloads/orders/:orderNo` 直到订单变为 `paid`；弹窗被拦截时降级为同页跳转 `${WEB_URL}/downloads/return?order=<orderNo>`。
3. 回跳页调用 `POST /downloads/orders/:orderNo/capture`：后端执行 `POST /v2/checkout/orders/{id}/capture` 完成扣款，再幂等履约（已支付订单直接返回）。
4. PayPal Webhook `PAYMENT.CAPTURE.COMPLETED` 作为异步兜底，同样走幂等履约；`PAYMENT.CAPTURE.DENIED`/`DECLINED` 会把订单标记为 `failed`。

配置要点：

- 填写 `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`（developer.paypal.com → Apps & Credentials），`PAYPAL_MODE` 选 `sandbox` 或 `live`。
- Webhook 地址：`https://<域名>/api/v1/payments/webhook/paypal`，订阅 `PAYMENT.CAPTURE.COMPLETED`、`PAYMENT.CAPTURE.DENIED`、`PAYMENT.CAPTURE.DECLINED`，把生成的 Webhook ID 填入 `PAYPAL_WEBHOOK_ID`。
- `PAYPAL_MODE=live` 时 PayPal 要求回跳地址为 **https**，因此生产环境 `PUBLIC_BASE_URL` 必须是 https 域名；本地联调用 sandbox。
- 凭据为空时 API 仍可启动（`/health` 报 `paypal: not_configured`），但不会创建任何订单，前端会收到 `PAYMENT_NOT_CONFIGURED` 提示；没有模拟支付旁路。

## 模板存储（本地磁盘）

模板不再依赖 S3 或任何对象存储，全部由 API 从服务器本地磁盘流式下发：

- `TEMPLATE_DIR`：随代码发布的模板（默认 `../web/public/templates`）。
- `STORAGE_DIR`：可写目录（默认 `./storage`，容器内为 `/app/storage`，compose 已挂载 `./storage` 卷）。把新的 IRS 修订版放到 `storage/templates/US/W9/fw9.pdf` 等同名路径即可覆盖内置模板，无需重建镜像；响应头 `X-Template-Storage` 会标记来源。
- 路径解析会拒绝 `..` 之类的越界访问；同一文件同时存在时**可写目录优先**。

## 表单引擎与 PDF 管线

1. `packages/tax-form-engine` 定义每张表的 `steps`（分组、字段、条件 `requiredWhen`）、`pdf.fields`（IRS 字段名映射）、`optionGroups`、签名位与 SEO 内容。
2. `packages/validation` 依配置生成 Zod schema，前端 RHF 与后端共用。
3. 前端 `form-filler` 用 PDF.js 渲染预览；用户点击生成时才动态加载 `@tax/pdf-engine`（pdf-lib 不进入首屏包）。
4. `pdf-engine` 拉取官方模板 → 写入 AcroForm 字段 → 移除签名 widget → flatten → 返回 data URL 下载。
5. 官方模板下载与字段核对：`python3 scripts/inspect_forms.py`、`pnpm pdf:calibrate`。

模板默认随镜像发布；更新 IRS 修订版时只需把同名 PDF 放入 `STORAGE_DIR/templates`（compose 已挂载 `./storage` 卷），无需重建镜像。

## SEO / AI 层

- `app/sitemap.ts` / `app/robots.ts` / `app/llms.txt/route.ts` / `app/llms-full.txt/route.ts` / `app/manifest.ts`
- 落地页与 `/tax-forms/[slug]` 共享 canonical（统一指向 `form.seo.landingPath`）
- 生成器别名路由：`/w9-form-generator`、`/w-9-form-generator`、`/w4-form-generator`、`/w-4-form-generator`、`/w8ben-form-generator`、`/w8bene-form-generator`、`/w8ben-e-form-generator`（均 canonical 到对应落地页）
- 填写页 `noIndex` 且响应头 `Cache-Control: no-store`
- 机器可读资源：`/api/ai/forms`、`/api/ai/forms/[slug]`、`/api/ai/forms/[slug]/markdown`，均带 CORS 与 `Link: rel="canonical"`
- 落地页输出 `<link rel="alternate" type="text/markdown">`，并为每个页面输出 og/twitter 1200×630 卡片
- 结构化数据按页装配：WebPage（含 `dateModified` = 表单修订日期）、SoftwareApplication、FAQPage、BreadcrumbList、ItemList、OfferCatalog

## 验证

```bash
pnpm build                                   # packages + web + api
pnpm typecheck
python3 scripts/inspect_forms.py             # 模板字段与映射核对
pnpm smoke                                   # 端到端冒烟（默认打 http://localhost:8080/api/v1）
curl -s localhost:4000/api/v1/health
curl -s localhost:4000/api/v1/tax-forms/W9/template | head -c 8   # %PDF-1.
```

端到端冒烟建议顺序：注册 → `/health`（`paymentProvider=paypal`）→ `downloads/access`（未付费 `active=false`，单价 `1.00`）→ `downloads/checkout` → PayPal 弹窗审批 → 回跳页 `capture` 或 Webhook 履约 → `downloads/access` 变为 `active=true` → 另一张表仍为 `false` → 管理员登录查看统计。

`pnpm smoke` 会先读 `/health`：凭据已配置时只创建一笔待支付订单并校验 `checkoutUrl` 指向 PayPal（不会扣款）；凭据为空时则断言 `downloads/checkout` 返回 `PAYMENT_NOT_CONFIGURED`，并验证无签名的回调被拒、`/payments/webhook/mock` 已不存在。真实支付只在 PayPal sandbox 手动验证。

## 安全与隐私

- 表单答案与签名只在浏览器内存/本地草稿中处理，不上传；服务端只保存“生成过哪张表”的元数据。
- 支持 SSN/EIN 字段不在 URL、日志、缓存 key 中出现。
- 密码 bcrypt 哈希；refresh token 轮换并记录撤销 jti（Redis）。
- 登录/注册/后台登录有 IP 限流；全局异常过滤器统一错误结构，500 不外泄内部信息。
- 生产建议：`docker/nginx.conf` 已内置安全响应头与 gzip，启用 TLS 段落并挂载证书。

## 常见问题

- **本机端口被占用**：修改 `.env` 的 `MYSQL_PORT` / `REDIS_PORT` / `HTTP_PORT`，并同步 `DATABASE_URL`、`REDIS_URL`。Compose 内部服务始终使用容器网络端口（`mysql:3306`、`redis:6379`）。
- **模板 404**：`TEMPLATE_DIR` 相对 API 工作目录解析；配置里的路径形如 `/templates/US/W9/fw9.pdf`，存储层会自动去掉 `/templates/` 前缀。
- **Redis 未启动**：API 仍可运行，缓存与令牌撤销检查自动降级。
- **PayPal 未配置**：PayPal 是唯一支付方式，`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` 为空时 `/health` 报 `paypal: not_configured`，`/downloads/checkout` 返回 `400 PAYMENT_NOT_CONFIGURED`；不存在模拟支付或其它渠道的降级路径。
- **PayPal 回跳 404 / 无法扣款**：确认 `PUBLIC_BASE_URL` 与访问域名一致（live 必须 https），且 `PAYPAL_WEBHOOK_ID` 与后台 Webhook 一致。
