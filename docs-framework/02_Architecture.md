# 02 Architecture｜学生实训室进组选拔平台

> 版本：v1.0（阶段 1 定稿待确认）
> 本文档锁定技术栈与分层，阶段 3 起代码生成以本文档为唯一基准。

## 1. 技术栈

| 层 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 后端框架 | Spring Boot | 3.3.x | JDK 17 基线 |
| 语言 | Java | 17 | LTS |
| ORM | MyBatis-Plus | 3.5.x | 适配 Boot 3 |
| 数据库 | MySQL | 8.0 | InnoDB / utf8mb4 |
| 缓存 | Redis | 7.x | Token 黑名单、登录限流、热点缓存 |
| 认证 | Spring Security 6 + JJWT | 6.x / 0.12.x | JWT 无状态 + 黑名单 |
| 接口文档 | SpringDoc OpenAPI 3 | 2.x | 含 JWT SecurityScheme |
| 参数校验 | Spring Boot Validation | 3.x | `@Validated` |
| 工具库 | Hutool | 5.8.x | 判空、脱敏、Excel |
| 定时任务 | Spring `@Scheduled` | 内置 | 逾期确认扫描、递补触发 |
| 前端框架 | Vue 3 + TypeScript | 3.4+ / 5.x | Vite 构建 |
| UI 库 | Element-Plus | 2.x | 表格、表单、弹窗 |
| 状态管理 | Pinia | 2.x | 登录态、轮次态 |
| 路由 | Vue Router | 4.x | History 模式 |
| 请求库 | Axios | 1.x | 统一封装于 `src/api/` |
| 构建 | Maven / pnpm | 3.9 / 8.x | 后端 / 前端 |
| 部署 | Docker + Nginx | 24.x / 1.25 | Compose 编排 |

**约束**：未经确认不得引入列表外框架；不引入 Lombok 以外的字节码增强（如 MapStruct 需单独批准）。

## 2. 目录结构

```text
elect-project/
├── frontend/                       # Vue 3 前端
│   ├── src/
│   │   ├── api/                    # Axios 接口封装，按端分文件
│   │   ├── assets/
│   │   ├── components/             # 复用组件
│   │   ├── layouts/                # 学生端/教师端/管理端三套布局
│   │   ├── mock/                   # 阶段 3 专用假数据，阶段 4 移除
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   ├── student/
│   │   │   ├── teacher/
│   │   │   ├── leader/
│   │   │   └── admin/
│   │   ├── router/
│   │   ├── store/
│   │   ├── types/                  # 与 04_API.md 一一对应的 TS 类型
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── backend/                        # Spring Boot 后端
│   ├── src/main/java/
│   ├── src/main/resources/
│   ├── src/test/java/
│   ├── Dockerfile
│   └── pom.xml
├── docs-framework/                 # 唯一真理源，禁止业务代码写入
│   ├── 01_PRD.md
│   ├── 02_Architecture.md
│   ├── 03_Database.md
│   ├── 04_API.md
│   └── flow/
├── 素材/                           # 原始素材、评审记录、过程资产
├── docker-compose.yml
└── README.md
```

## 3. 后端分层与包结构

```text
com.college.labselect/
├── LabSelectApplication.java
├── common/
│   ├── Result.java                 # 统一响应
│   ├── PageResult.java             # 分页响应
│   ├── ResultCode.java             # 错误码枚举
│   └── DesensitizeUtils.java       # 学号/姓名/手机号脱敏
├── controller/
│   ├── publicapi/                  # /api/v1/public/**
│   ├── auth/                       # /api/v1/auth/**
│   ├── student/                    # /api/v1/student/**
│   ├── teacher/                    # /api/v1/teacher/**
│   ├── leader/                     # /api/v1/leader/**
│   └── admin/                      # /api/v1/admin/**
├── service/
│   ├── IXxxService.java
│   └── impl/XxxServiceImpl.java
├── mapper/                         # 继承 BaseMapper<T>
├── entity/                         # 与 03_Database.md 逐字段一致
├── dto/
│   ├── req/
│   └── resp/
├── exception/
│   ├── BusinessException.java
│   └── GlobalExceptionHandler.java
├── config/
│   ├── SecurityConfig.java
│   ├── MybatisPlusConfig.java
│   ├── RedisConfig.java
│   ├── WebMvcConfig.java
│   ├── I18nConfig.java
│   └── SwaggerConfig.java
├── security/
│   ├── JwtUtils.java
│   ├── JwtAuthenticationFilter.java
│   └── LoginUser.java
├── aspect/
│   ├── WebLogAspect.java
│   └── RateLimitAspect.java
├── job/
│   ├── ConfirmTimeoutJob.java      # 逾期未确认扫描
│   └── WaitlistPromoteJob.java     # 递补触发（或与上一个合并）
└── utils/
```

**分层职责**

| 层 | 职责 | 禁止 |
|---|---|---|
| Controller | 接参、`@Validated` 校验、调 Service、包装 `Result<T>` | 写业务逻辑、直接调 Mapper |
| Service | 业务规则、事务、名额条件更新、状态机流转 | 拼接复杂 SQL、返回 Entity 给前端 |
| Mapper | 单表 CRUD 继承 `BaseMapper`；复杂连表写 XML | Java 里拼 SQL 字符串 |
| Entity | 与 DDL 字段一一对应 | 承载业务方法 |

## 4. 鉴权与会话

- **方案**：JWT 无状态 + Redis 黑名单。
- **Token**：`Authorization: Bearer <token>`，有效期 2 小时。
- **续期**：每次请求命中 `exp` 前 30 分钟时，签发新 Token 并通过响应头 `X-New-Token` 下发。
- **登出与强制失效**：登出、禁用账号、重置密码时，将 Token 的 `jti` 写入 Redis，TTL 与 Token 剩余有效期一致。
- **角色判定**：
  - `user_type`：1 学生、2 教师、3 管理员。
  - 负责人不单独设角色：`/api/v1/leader/**` 接口校验当前用户在 `lab.leader_id` 中存在记录。
  - 路径前缀 + 角色双重校验，任一不满足返回 403001。
- **首登改密**：`sys_user.need_change_pwd = 1` 时，除 `/auth/change-password`、`/auth/logout` 外全部接口返回 401004。
- **放行路径**：`/api/v1/auth/login`、`/api/v1/public/**`、`/v3/api-docs/**`、`/swagger-ui/**`、`/doc.html`。
- **密码**：BCrypt，强度 10。

## 5. 关键横切能力

| 能力 | 实现方式 |
|---|---|
| 统一响应 | `Result<T>{ code, message, data }`，静态方法 `success()` / `error(ResultCode)` |
| 分页 | MyBatis-Plus `Page` + `PageResult<T>{ total, pageNum, pageSize, list }` |
| 全局异常 | `@RestControllerAdvice`：`MethodArgumentNotValidException` → 400001；`BusinessException` → 自定义码；其余 → 500001 |
| 日志追踪 | `@WebLog` + AOP，记录 URL、Method、IP、入参、出参、耗时；Logback 按天与 50MB 滚动 |
| 限流 | `@RateLimit(count=5, time=60)` + Redis 计数，用于 `/auth/login` |
| 国际化 | `LocaleResolver` + `messages*.properties`，业务异常消息按 `Accept-Language` 返回 |
| 数据脱敏 | 视图中非本人数据统一走 `DesensitizeUtils`；禁止在 Controller 手写掩码字符串 |
| 操作留痕 | 名额调整、顺位调整、调剂、异议处理统一写 `operation_log` |
| 接口文档 | SpringDoc OpenAPI 3，配置全局 JWT SecurityScheme |
| 文件处理 | Excel 导入导出用 Hutool `ExcelUtil`；附件存本地 `/data/upload` 并映射静态路径 |

## 6. 并发与一致性设计

| 风险点 | 方案 |
|---|---|
| 名额超录 | `UPDATE mentor_profile SET quota_used = quota_used + 1, version = version + 1 WHERE id = ? AND quota_used < quota`，影响 0 行即失败 |
| 抢录并发 | `admission` 上 `uk_round_student_active(round_id, student_id, active_flag)` + 名额条件更新双重兜底；两个导师抢同一学生时唯一键直接冲突，失败方返回已被谁录入 |
| 批次锁定 | `selection_round.locked = 1` 后业务写接口统一拦截返回 400005；**快照生成、解锁、异议处理与入组确认不受限** |
| 名额释放 | 事务内 `quota_used = quota_used - 1 WHERE id = ? AND quota_used > 0` |
| 名额冻结 | 第 1 轮 `apply_start` 后拒绝负责人修改 `quota`（400004）；管理员强制调整走 `/admin/mentors/{id}/quota`，需写 `operation_log` 并在学生端公告 |
| 重复录取 | `admission` 唯一键 `uk_round_student_active(round_id, student_id, active_flag)`，数据库层保证同轮唯一有效录取 |
| 重复填报 | `intention` 唯一键 `(round_id, student_id)`，提交走覆盖更新 |
| 一套分数 | `interview_score` 唯一键 `(round_id, lab_id, student_id)` |
| **批次签发** | `nomination_submit_end` 到点触发，Redis 锁 `lock:round:{id}:issue`；**先全部签发再按学生维度判定**，禁止边交边判 |
| **递补级联** | 每个导师一把锁 `lock:mentor:{id}:cascade`；跳过已确认/已持有对象；循环补位；唯一键保证幂等 |
| 逾期确认 | `@Scheduled(cron = "0 * * * * ?")` 每分钟扫描；多实例部署时加 Redis 分布式锁 |
| **名额对账** | 两条独立校验：导师维度 `SUM(quota) = SUM(quota_used) + SUM(quota - quota_used)`；学生维度 `SUM(quota_used) = COUNT(active_flag = 1) + COUNT(status = 1)`，在级联收敛后执行，不一致仅告警 |
| 批量调剂 | 逐条独立处理，允许部分成功并返回失败明细，不回滚已成功项 |
| **幂等写入** | 提交、确认、签发、调剂统一支持 `Idempotency-Key` 请求头，Redis 缓存结果 24 小时 |

## 7. 前端架构

| 项 | 约定 |
|---|---|
| 三套布局 | `PublicLayout`（无侧栏）、`StudentLayout`、`TeacherLayout`（导师/负责人共用，按权限显隐菜单）、`AdminLayout` |
| 路由守卫 | 按 `user_type` 与 `lab.leader_id` 动态生成可访问菜单；未登录跳对应登录页 |
| 请求封装 | `src/api/request.ts` 统一加 Token、统一解包 `{code,message,data}`、401 跳登录、401004 跳改密 |
| 类型 | `src/types/` 与 `04_API.md` 一一对应，禁止 `any` |
| 状态 | Pinia `useUserStore`（用户与权限）、`useRoundStore`（当前轮次与倒计时） |
| 倒计时 | 以服务端 `serverTime` 与 `countdownSeconds` 校准，禁止纯前端 `Date.now()` |
| 阶段 3 约束 | 只做 UI + `src/mock` 假数据，禁止真实 HTTP |

## 8. 部署拓扑

```text
浏览器
  │
  ▼
Nginx (frontend:80)
  ├── /            → Vue 静态资源（History 回退 index.html）
  └── /api/        → http://backend:8080
                        │
                        ├── MySQL 8.0 (mysql:3306, 卷持久化)
                        └── Redis 7 (redis:6379, AOF)
```

- 网络：自定义 bridge `labselect_net`，服务间用容器名互访。
- 启动顺序：MySQL / Redis `healthcheck` 通过 → backend → frontend。
- 初始化：`03_Database.md` 的 DDL 抽为 `schema.sql`，挂载到 `/docker-entrypoint-initdb.d/`。
- 时区：所有容器 `Asia/Shanghai`，JVM 启动参数 `-Duser.timezone=Asia/Shanghai`。

## 9. 环境与配置

| 环境 | 配置文件 | 数据库 | Redis | 说明 |
|---|---|---|---|---|
| dev | `application-dev.yml` | 本地 MySQL | 本地 Redis | 开启 SQL 日志 |
| test | `application-test.yml` | 测试库 | 测试 Redis | 单元测试与集成测试使用 |
| prod | `application-prod.yml` | 容器 MySQL | 容器 Redis | 关闭 SQL 日志，敏感配置走环境变量 |

敏感项（数据库密码、JWT 密钥）一律走环境变量 `${DB_PASSWORD}` / `${JWT_SECRET}`，禁止硬编码，禁止提交 `.env`。

## 10. 数据分级与合规

| 级别 | 内容 | 处理要求 |
|---|---|---|
| L1 公开 | 实训室档案、导师方向、名额、公示名单（脱敏） | 可匿名访问 |
| L2 内部 | 学生基础档案、意向、评分、拟录取、录取结果 | 登录 + 角色 + 归属校验 |
| L3 敏感 | 手机号、邮箱、异议附件、操作日志 | 加密存储、最小化采集、严格审计 |

- **留存**：业务数据保留至本届选拔结束后 1 年；`operation_log` 保留 3 年。
- **导出**：批量导出需管理员角色，导出文件带操作人水印，写 `operation_log`。
- **日志脱敏**：日志与异常堆栈中不得出现完整手机号、邮箱、作答原文。
- **密钥轮换**：JWT 密钥每 90 天轮换一次；账号禁用后旧 Token 立即拉黑。
- **个人信息最小化**：不采集身份证号、家庭住址、成绩单等非必要字段。

## 11. 定时任务清单

| 任务 | 触发 | 幂等保证 |
|---|---|---|
| 拟录取批次签发 | `nomination_submit_end` 到点 | Redis 锁 + `admission` 唯一键 |
| 逾期未确认扫描 | 每分钟 | 状态条件 `status = 1 AND confirm_deadline < NOW()` |
| 递补级联 | 名额释放时触发 | 导师级锁 + `waitlist.apply_status` 状态机 |
| 轮次状态自动流转 | 每分钟 | 状态机校验，重复执行无副作用 |
| 名额对账 | 每轮结束时 | 只读比对，存在待确认时跳过 |
| 轮次快照 | 每轮结束、公示确认后 | 追加写入 + `is_current` 切换，不覆盖历史 |
| 批次锁定 | 归档快照生成且公示确认后 | 人工触发，前置校验 + 原因留痕 |
| 通知补发 | 每分钟重试失败通知 | `user_notice` 唯一键 `(biz_type, biz_id, user_id, notice_type)` |
