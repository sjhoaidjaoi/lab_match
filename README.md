# 软件学院学生实训室进组选拔管理系统

依据《软件学院学生实训室进组选拔系统——初版项目框架说明 V0.1》搭建的首轮工程骨架。当前交付只提供工程、权限入口、页面路由、模块占位、基础接口契约和公共横切能力，不实现八阶段的完整业务规则。

## 项目结构

```text
lab_match/
├── frontend/          Vue 3 + TypeScript + Vite + Element Plus + Pinia
├── backend/           Spring Boot 3 + Java 17 + MyBatis-Plus Maven 工程
├── database/          MySQL 建表与种子数据（待按 V0.1 实体清单继续校准）
├── docs-framework/    状态枚举、响应结构和联调约定
└── 素材/              宣讲、开放日和全景素材目录（不提交大型视频）
```

原有 Express 文件仍保留在 `backend/`，以避免覆盖团队已有内容；本轮新的后端启动入口为 `pom.xml` 和 `src/main/java/`，后续请以 Spring Boot 工程为准。

## 已实现的框架

- 四角色：学生 `STUDENT`、实训室教师 `LAB_TEACHER`、实训室组长 `LAB_LEADER`、学院总负责人 `COLLEGE_ADMIN`。
- 八阶段：集中宣讲、开放日、意向填报、面试、拟录取确认、分轮补录、统筹调剂、公示入组均有路由和菜单入口。
- 学生端、教师端、组长端、学院端工作台；路由守卫、403/404、统一布局和页面占位。
- 集中宣讲视频与全景云游播放器容器；未配置素材时明确显示占位提示。
- Spring Boot 健康检查、开发演示登录、统一 `Result<T>`、全局异常、`@WebLog`、`@RateLimit`、LocaleResolver、OpenAPI JWT SecurityScheme 和 MyBatis-Plus Mapper/Service 分层占位。

## 学生端 MySQL MVP

学生端数据库联调使用独立的 `mvp` 配置。初始化、启动和跨角色验收步骤见 [学生端 MySQL MVP 联调](docs/requirements/STUDENT-MVP.md)。

## 启动方式

### 前端

```powershell
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。Vite 将 `/api` 转发至 `http://localhost:8080`。

### 后端

安装 Java 17 与 Maven 后执行：

```powershell
cd backend
mvn spring-boot:run
```

- 健康检查：`GET http://localhost:8080/api/health`
- Swagger：`http://localhost:8080/swagger-ui.html`
- 演示登录：`POST /api/auth/login`，用户名可使用 `admin`、`L001`、`T1001` 或任意学生账号；密码仅为开发占位。

MySQL 和 Redis 参数通过 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`、`REDIS_HOST`、`REDIS_PORT` 预留。当前未启用数据库连接，以便框架在没有中间件的本地环境中启动。

## 待实现

真实 JWT/Redis 黑名单、数据库实体映射与迁移、后端 RBAC 数据范围校验、页面表单提交、媒体存储、评分规则、递补规则、调剂规则和公示隐私策略，均需学院/团队确认后按模块逐步实现。
