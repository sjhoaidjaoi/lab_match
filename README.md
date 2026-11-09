# lab_match · 学生实训室进组选拔平台

面向学院实训室进组选拔的全流程平台：**双向选择 · 分轮录取 · 统筹调剂**。

八阶段流程（与集中宣讲海报一致）：

1. 集中宣讲 → 2. 实训室开放日 → 3. 意向填报 → 4. 导师初选与面试考核 → 5. 拟录取与学生确认 → 6. 分轮补录 → 7. 统筹调剂录取 → 8. 结果公示与正式入组

四类角色：**学生 / 导师 / 实训室负责人 / 学院管理员**（统一登录入口，按角色展示不同菜单）。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router |
| 后端 | Spring Boot 3.3 + Java 17 + MyBatis-Plus 3.5 |
| 数据库 | MySQL 8.0（utf8mb4） |
| 鉴权 | JWT（无状态）+ 自定义拦截器 + `@RequireRole` |

> 设计文档中的 Redis 缓存与 Token 黑名单暂未接入，当前为单体 + MySQL 的可运行骨架；接入 Redis 时只需在 `AuthInterceptor` 增加黑名单校验，并复用现有审计/通知模块。

## 目录结构

```
lab_match/
├── backend/                       # Spring Boot 后端
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/labmatch/
│       │   ├── common/            # Result、错误码、业务异常、全局异常
│       │   ├── config/            # MyBatis-Plus、CORS、拦截器、Swagger、密码器
│       │   ├── security/          # JWT、登录上下文、角色注解、鉴权拦截器
│       │   ├── seed/              # 演示数据初始化器
│       │   └── module/            # 按业务模块分包（见下表）
│       └── resources/
│           ├── application.yml
│           └── db/init.sql        # 全量建表脚本（39 张表）
├── frontend/                      # Vue 3 前端
│   └── src/
│       ├── api/                   # 按模块拆分的接口封装
│       ├── components/            # PageStub / Workbench / StageBanner
│       ├── config/                # 八阶段定义、工作台配置
│       ├── layouts/               # 主布局（侧边菜单 + 阶段条 + 角色切换）
│       ├── router/                # 路由与角色菜单
│       ├── stores/                # Pinia：登录态、周期阶段
│       ├── types/                 # 全局类型
│       └── views/                 # 四端页面（student/mentor/leader/admin）
└── docs/requirements/             # 需求与设计文档归档
```

## 快速启动

### 1. 初始化数据库

```bash
mysql -u root -p < backend/src/main/resources/db/init.sql
```

### 2. 启动后端

默认连接 `localhost:3306/lab_match`，账号 `root/123456`，可用环境变量覆盖：
`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USERNAME`、`DB_PASSWORD`。

```bash
cd backend
mvn spring-boot:run
```

- 接口文档：http://localhost:8080/swagger-ui.html
- 首次启动会自动写入演示账号、实训室、导师、周期、名额与公告（`lab-match.demo-data=false` 可关闭）
- 演示周期的时间窗按启动时刻相对生成，启动后即处于「意向填报」阶段，方便联调

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 ，Vite 已代理 `/api` 到 `http://localhost:8080`。

### 演示账号（密码均为 `123456`）

| 角色 | 学号/工号 | 说明 |
| --- | --- | --- |
| 学生 | `2022001` / `2022002` / `2022003` | 陈晨 / 林小雨 / 周航 |
| 导师 | `T1001` / `T1002` | 王强 / 赵雪 |
| 导师 + 实训室负责人 | `T1000` | 李敏（登录后可切换角色） |
| 学院管理员 | `admin` | 含系统管理员角色 |

## 八模块与代码位置

| 阶段 | 后端模块 | 前端页面（四端） | 状态 |
| --- | --- | --- | --- |
| ① 宣讲 / ② 开放日 | `module/base`（公告、开放日、实训室、导师、**宣讲视频、全景云游**） | `student/catalog`、`student/lectures`、`student/openday`、`admin/videos`、`admin/panoramas` | 目录与媒体资源已实现（含管理端 CRUD） |
| ③ 意向填报 | `module/application` | `student/application`、`admin/monitor`、`leader/monitor` | **已提供参考实现**（薄封装，可复用） |
| ④ 面试与问卷 | `module/interview` | `student/interview`、`mentor/*`、`leader/scoring` | 骨架 + 接口占位 |
| ⑤ Offer 与确认 | `module/offer` | `student/offer`、`mentor/offers`、`admin/offers` | 骨架 + 接口占位 |
| ⑥ 分轮补录 | `module/supplement` | `student/supplement`、`mentor/supplement`、`admin/vacancies` | 骨架 + 接口占位 |
| ⑦ 统筹调剂 | `module/adjustment` | `student/adjustment`、`leader/reallocation`、`admin/reallocation` | 骨架 + 接口占位 |
| ⑧ 公示与异议 | `module/publicity` | `student/publication`、`admin/publication`、`admin/objections` | 骨架 + 接口占位 |
| 横切：账号 / 通知 / 审计 | `module/auth`、`notification`、`audit` | `admin/accounts`、`student/messages`、`admin/audit` | 账号列表与通知已实现，其余占位 |

数据库表共 41 张（`user_account` ~ `lab_panorama`），完整结构见 [init.sql](backend/src/main/resources/db/init.sql)。

## 接口约定

- 统一响应：`{ "code": "OK", "message": "ok", "data": ... }`；业务失败时 `code` 为字符串错误码（见 `ResultCode`）
- 登录：`POST /api/auth/login`，后续请求携带 `Authorization: Bearer <token>`
- 多角色账号通过请求头 `X-Role` 声明当前角色；服务端每次请求都会回库校验角色与账号状态，不信任前端
- 敏感操作的时间窗、名额、越权校验必须放在服务端（`StageService` 已提供阶段机参考）

## 宣讲视频与 720° 全景云游接入

阶段一的宣讲视频放在 `lab_video` 表，阶段二的开放日云游放在 `lab_panorama` 表，两者都按 `lab_id` 归属实训室，前端通过 `/api/media/**` 读取。

| 接口 | 说明 | 权限 |
| --- | --- | --- |
| `GET /api/media/videos?labId=` | 已发布宣讲视频 | 登录用户 |
| `GET /api/media/labs/{labId}/videos` | 某实训室视频 | 登录用户 |
| `GET /api/media/panoramas?labId=` | 已发布全景资源 | 登录用户 |
| `GET /api/media/labs/{labId}/panoramas` | 某实训室全景 | 登录用户 |
| `/api/media/admin/videos`（GET/POST/PUT/DELETE） | 视频增删改查（含草稿） | `COLLEGE_ADMIN`、`LAB_HEAD` |
| `/api/media/admin/panoramas`（GET/POST/PUT/DELETE） | 全景增删改查（含草稿） | `COLLEGE_ADMIN`、`LAB_HEAD` |

**三种视频地址形态**（`lab_video.video_type`）：

- `MP4`：直链，走 `<video>` 播放器（可配封面与时长）
- `LINK` / `EMBED`：外链或内嵌页面，走 `<iframe>`，可直接填 B 站 / 校内视频平台的嵌入地址

**两种全景形态**（`lab_panorama.panorama_type`）：

- `LINK`：720 云 / Krpano / 自建全景作品页，iframe 加载（若对方设置 `X-Frame-Options`，可点击“新窗口打开”）
- `IMAGE`：等距柱状全景图直链，当前以图片铺满展示，后续在 [PanoramaViewer.vue](frontend/src/components/media/PanoramaViewer.vue) 中接入 Pannellum / three.js 即可获得拖拽漫游与热点

前端复用组件：`components/media/VideoPlayer.vue`、`components/media/PanoramaViewer.vue`；管理页面为 `views/admin/AdminVideos.vue`、`views/admin/AdminPanoramas.vue`。演示数据里的视频/全景地址是占位符，请在管理端替换为真实资源。

## 团队分工建议

| 小组 | 建议负责范围 | 后端 | 前端 |
| --- | --- | --- | --- |
| 基础设施组 | 公共能力、鉴权、阶段机、联调与部署 | `common/`、`config/`、`security/`、`seed/` | `layouts/`、`components/`、`router/` |
| 学生端组 | ③⑤⑥⑦⑧ 学生侧流程 | `module/application`（扩展） | `views/student/*` |
| 导师端组 | ④ 问卷/评分/名单 | `module/interview` | `views/mentor/*` |
| 负责人端组 | ⑤⑥⑦ 本室统筹与名单汇总 | `module/offer`、`module/supplement` | `views/leader/*` |
| 管理端组 | ①⑧ 周期、名额、公示、异议、报表 | `module/base`、`module/publicity` | `views/admin/*` |
| 数据与审计组 | 名额台账、审计、通知、统计 | `module/adjustment`、`audit`、`notification` | `views/admin/reports`、`views/admin/audit` |

每个占位页顶部已标注**所属阶段、待实现清单、相关接口与负责小组**；后端占位接口统一抛出 `NOT_IMPLEMENTED` 并带有 TODO 注释，便于直接接手。

## 已知限制（下一步）

- JWT 登出仅前端清除 token，服务端黑名单待接入
- Excel 导入/导出、附件上传、短信/邮件通知未实现
- 演示数据使用相对时间，正式上线前请由管理员配置真实周期
- 演示用的宣讲视频/全景地址为占位符，需在管理端替换；`IMAGE` 类型目前只做静态展示，尚未接入 Pannellum 漫游

## 文档索引

- [需求 PRD](docs/requirements/01-需求PRD.md)
- [技术架构](docs/requirements/02-技术架构.md)
- [系统设计文档 v3](docs/requirements/03-系统设计文档-v3.md)
- [项目执行方案](docs/requirements/04-项目执行方案.md)
