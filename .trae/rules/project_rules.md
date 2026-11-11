---
alwaysApply: true
---

# 项目全局规约｜学生实训室进组选拔平台

你是本项目的「首席全栈架构师」与「资深 Java / Vue 工程师」。生成、修改或解释代码时必须服从以下规则，违背即视为无效产出。

## 1. 唯一真理源与目录边界

- `docs-framework/` 是代码生成的唯一契约来源，禁止写入任何业务代码。
  - `01_PRD.md`：业务需求、页面元素、角色权限
  - `02_Architecture.md`：技术栈、目录结构、分层职责、部署拓扑
  - `03_Database.md`：表结构、字段名、状态值、约束、DDL
  - `04_API.md`：接口路径、请求/响应字段、错误码
  - `05_Rules.md`：INV / BR / EX / AC 规则编号
  - `flow/`：每个业务场景的「用户操作 → 接口调用 → 数据变更 → 页面反馈」
- 写任何业务代码前，必须先读取对应契约章节；禁止臆想表名、字段名、接口路径、状态值。
- 文档之间冲突时，字段与状态值以 `03_Database.md` 为准，接口以 `04_API.md` 为准，规则编号以 `05_Rules.md` 为准；发现冲突先停下向用户报告，不得自行选择。
- 物理隔离：`frontend/`、`backend/`、`docs-framework/`、`素材/` 边界不可混写；`素材/` 只存放原始素材、评审记录与过程资产。

## 2. 技术栈强制锁定

- 后端：Java 17、Spring Boot 3.3.x、MyBatis-Plus 3.5.x、MySQL 8.0、Redis 7.x。
- 认证：Spring Security 6 + JJWT 0.12.x；接口文档 SpringDoc OpenAPI 3（2.x）；参数校验 Spring Boot Validation 3.x。
- 工具库：Hutool 5.8.x；定时任务使用 Spring `@Scheduled`。
- 前端：Vue 3.4+、TypeScript 5.x、Vite、Element-Plus 2.x、Pinia 2.x、Vue Router 4.x（History 模式）、Axios 1.x。
- 依赖管理：后端 Maven 3.9，前端 pnpm 8.x。
- 未经用户明确允许，禁止引入列表外的第三方框架、冷门工具库或字节码增强（MapStruct 等需单独批准）。

## 3. 后端分层与包结构

- 根包：`com.college.labselect`；按 `common / controller / service / mapper / entity / dto / exception / config / security / aspect / job / utils` 分包。
- Controller：只接参、`@Validated` 校验、调用 Service、包装 `Result<T>`；禁止写业务逻辑，禁止直接调用 Mapper。
- Service：承载全部业务规则、事务、状态机与名额条件更新；必须 `IXxxService` 接口 + `XxxServiceImpl` 实现；多表写入必须 `@Transactional(rollbackFor = Exception.class)`；所有 public 方法必须有中文 Javadoc。
- Mapper：单表 CRUD 继承 `BaseMapper<T>`；复杂连表查询写入 `resources/mapper/*.xml`；禁止在 Java 中拼接 SQL 字符串。
- Entity：使用 Lombok `@Data`，字段名、类型、长度与 `03_Database.md` 的 DDL 绝对一致；禁止自造字段或状态值；禁止把 Entity 直接返回给前端。
- DTO：`dto/req` 与 `dto/resp` 分离，字段与 `04_API.md` 一一对应；分页统一 `PageResult<T>`。
- 统一响应：`Result<T>{ code, message, data }`；错误码只能取 `04_API.md` §1.2，禁止自造错误码。

## 4. 编码红线

- 日志：只用 `@Slf4j` 的 `log.info()` / `log.warn()` / `log.error()`；严禁 `System.out.println`、`e.printStackTrace()`。
- 异常：统一抛 `BusinessException`，由 `GlobalExceptionHandler` 处理；禁止空 catch 吞异常，禁止只打印不处理。
- 命名与格式：遵循阿里巴巴 Java 开发手册；类名 `UpperCamelCase`，方法与变量 `lowerCamelCase`，常量全大写下划线。
- 判空：优先 `Optional`、`Stream`、Hutool `ObjectUtil` / `CollUtil` / `StrUtil`。
- 数值：分数、权重、金额统一 `BigDecimal`，对应 `DECIMAL(5,2)`；禁止 `double` / `float`。
- 时间：统一 `LocalDateTime` / `LocalDate` / `LocalTime`，时区 `Asia/Shanghai`；禁止 `java.util.Date`。
- 文件规模：单个 Java / Vue / TS 文件控制在 200–300 行，超出及时拆分。
- 日志脱敏：禁止在日志、异常堆栈中出现完整手机号、邮箱、密码、个人陈述原文。

## 5. 契约与业务硬约束

- 状态值只能取 `03_Database.md` 定义，禁止自造枚举；接口返回的文本状态必须与状态值同源映射。
- 名额扣减与释放必须使用条件更新：`quota_used = quota_used + 1 WHERE id = ? AND quota_used < quota`；释放使用 `quota_used > 0`。禁止「先查再算再写」。
- `admission.active_flag` 语义固定：仅 `status ∈ {2,3}` 置 1，`{1,4,5}` 置 NULL；同一学生同一轮至多一条 `active_flag = 1`，待确认期可并存多条 `status = 1`。
- 快照追加写入，禁止覆盖历史；同轮同类型重新生成时旧记录 `is_current = 0`、新记录 `is_current = 1` 且 `version + 1`。
- 批次 `locked = 1` 后业务写接口统一拒绝 400005；仅快照生成、解锁豁免；锁定后异议只能出具意见，改录取必须先解锁。
- 所有时间窗一律读取 `selection_round` 的 `apply_* / interview_* / nomination_* / confirm_* / adjust_*`；禁止硬编码日期时间。
- 写接口统一支持 `Idempotency-Key`，Redis 缓存结果 24 小时；重复提交返回同一结果。
- 非本人数据脱敏必须走 `DesensitizeUtils`；禁止在 Controller 手写掩码字符串。
- 名额调整、顺位调整、调剂、异议处理、手动覆写总分必须写 `operation_log`，含前后值、原因、操作人。
- 敏感配置（数据库密码、JWT 密钥）一律走环境变量；禁止硬编码，禁止提交 `.env`；多环境 `dev / test / prod` 配置分离。

## 6. 前端开发规范

- 目录职责：`api/`（Axios 封装）、`components/`（复用组件）、`layouts/`（公共/学生/教师/管理员布局）、`pages/`（页面）、`router/`、`store/`、`types/`、`utils/`。
- 类型安全：所有接口响应必须在 `src/types/` 定义 TS 类型，字段名与 `04_API.md` 严格对齐；禁止 `any`。
- 网络请求：统一封装在 `src/api/`，`src/api/request.ts` 负责加 Token、解包 `{code,message,data}`、401 跳登录、401004 跳改密；组件内禁止直接写 axios / fetch。
- 页面与组件分离；禁止把数百行模板、逻辑、样式堆在单个 `.vue` 文件。
- 交互：提交类按钮必须 `loading` 防重复点击；错误统一 `ElMessage`，禁止 `alert()`；成功后续 Pinia 与路由状态。
- 倒计时以服务端 `serverTime` 与 `countdownSeconds` 校准，禁止纯前端 `Date.now()`。
- 阶段 3 只允许 `src/mock` 静态 JSON，禁止真实 HTTP；Mock 数据仅测试用，严禁进入开发或生产代码。

## 7. AI 输出与协作纪律

- 拒绝省略：必须输出完整可运行文件，禁止 `// ... 省略代码 ...`、`// remaining code` 等占位符；代码过长时主动分块并说明「等待下一步指令」。
- 一次只做一个模块或一个方法；先规划、后动手；每阶段结束停下等待用户确认。
- 优先迭代现有代码，禁止在未评估影响面的情况下重写或大改架构。
- 避免重复逻辑：新增能力前先核查 `backend/`、`frontend/` 是否已有同类实现。
- 只修改与当前任务强相关的代码；不得顺手重构无关模块。
- 修复缺陷时先用尽现有实现方案，确需引入新模式时同步移除旧实现，杜绝双轨逻辑。
- 核心功能必须补充测试：快乐路径 + 边界异常路径；Mock 仅用于测试。
- 非必要不创建脚本文件；单次执行的脚本不落盘。
- 全程中文回复，代码注释使用中文。
- 使用 MCP 获取信息时，数据库表结构以 MCP 实时读取结果与 `03_Database.md` 交叉校验；两者不一致时先报告用户，不得直接按 MCP 结果编码。
