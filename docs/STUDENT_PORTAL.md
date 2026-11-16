# 学生端升级与验收

学生入口为 `/student/dashboard`。顶部的分组导航提供集中宣讲、实训室开放日、意向填报、面试、拟录取、调剂与补录、最终结果及帮助。旧填报回执和分轮补录地址仍能进入合并后的页面。

组长从「宣讲与开放日」维护本室资料。集中宣讲详情读取简介、宣讲文档和介绍视频，开放日详情读取独立的云游视频。视频可以上传 MP4 或填写链接，点击「保存并发布」后生效。MySQL 沿用 v3 的扩展字段保存云游视频地址及类型。

## 启动

在 `backend` 运行 `npm start`，在 `frontend` 运行 `npm run dev`，从 `http://127.0.0.1:5173/login` 登录。启用 MySQL 时先按现有环境配置运行 `npm run db:init`，再启动后端。迁移 v4 为已有志愿回填每批次每学生唯一的提交凭据，沿用 v3 的扩展字段保存导师选择、名额与面试详情。

## 接口与联动

- `POST /api/preferences/submit` 接收 `choices: [{ laboratoryId, labTeacherId }]`、`resumeId` 和两项独立调剂意愿。重复提交返回 409。
- 简历从 `/api/preferences/resumes/draft` 上传和更换，限 10 MB 的 PDF、DOC 或 DOCX。使用 `/api/preferences/resumes/:id` 下载，下载权限由学生本人、服务端绑定的导师、本室组长或学院角色决定。旧志愿允许没有附件。
- `/api/recruitment-reviews` 管理教师草稿与提交、组长退回和本室报送、学院审核发布及内部调剂汇总。教师建议不进入学生可见的拟录取表。
- `POST /api/interviews/schedule` 支持形式、地点及要求，保存后生成学生通知。
- `POST /api/admissions/:id/confirm` 确认一份邀请并释放其他邀请。导师名额由学院在实训室导师资料中配置，未配置时使用实训室总名额。
- `/api/adjustments` 的内部和院级入口依阶段开放，可指定目标导师。学生在统一页面分阶段查看。
- `GET /api/final/my` 只在本批次公示生效后返回本人结果。学生端公告查询使用 `GET /api/final/publication?visible=true`。
- `GET/POST /api/media/labs/:labId/materials` 列出或上传宣讲文件。登录用户可通过 `GET /api/media/labs/:labId/materials/:id` 下载。部署时需要持久化后端 `data/briefing-files` 目录。

## 变更范围

MySQL 启动前需运行 `npm run db:init` 应用迁移 v5。迁移建立简历元数据和名单版本表，沿用已有志愿记录。文件存放在 `backend/data/private-resumes`（可通过 `LAB_RESUME_DIR` 配置），应随数据库备份且不得映射为静态目录。默认在阶段四填写教师建议，阶段四或五报送本室名单，阶段五由学院审核并发布，阶段六结束后提交内部调剂汇总。导师账号由学院绑定。旧志愿未记录导师时保持原状，学院需核实后补录归属。

面试默认 30 分钟，可设为 5 至 180 分钟，检查教师和学生现有面试时段。内部调剂需要另一位本室导师和调剂原因，学生在第六阶段确认。现有 JSON、MySQL 存储均按单个后端写入实例部署。

学生端修改集中在 `StudentLayout.vue`、`student.css`、学生路由、工作台、宣讲、实训室详情、开放日、填报、面试、拟录取、调剂、最终结果和帮助页面。教师端补充宣讲文档上传与面试详情，组长和学院端补充目标导师选择，学院导师资料增加名额配置。后端改动集中在志愿、面试、拟录取、调剂、实训室、宣讲资料与最终结果路由，以及 MySQL 迁移和接口冒烟测试。
