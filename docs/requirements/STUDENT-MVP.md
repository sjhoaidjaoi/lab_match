# 学生端启动与验收

学生端通过 Spring Boot 读取实训室和本人回执，将平行志愿及两项调剂意愿写入 MySQL。教师可通过报名查询接口核对所属实训室的数据。面试、拟录取和公示也由学生端读取 MySQL。教师、组长和学院页面沿用仓库现有实现，本轮联调用测试库 SQL 提供面试、拟录取和公示数据。

## 启动

在新的 MySQL 8 测试实例上初始化。下列建表和种子脚本仅供首次初始化空库，`schema.sql` 包含删表语句。已有数据的实例请另建独立测试环境。

```sql
SOURCE D:/code/505/database/schema.sql;
SOURCE D:/code/505/database/student_mvp_seed.sql;
SOURCE D:/code/505/database/student_mvp_upgrade.sql;
```

已完成旧版 MVP 初始化的测试库只需执行 `student_mvp_upgrade.sql`。脚本保留现有志愿、账号和实训室编号，补齐四个演示实训室并创建简历表，可重复执行。

后端使用 JDK 17 或以上和 Maven。数据库连接请填写本地测试库信息。

```powershell
cd D:\code\505\backend
$env:SPRING_PROFILES_ACTIVE = 'mvp'
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3306/lab_match?characterEncoding=UTF-8'
$env:DB_USERNAME = '你的测试库账号'
$env:DB_PASSWORD = '你的测试库密码'
mvn spring-boot:run
```

前端另开 PowerShell。两个进程都启动后，从 [http://localhost:5173](http://localhost:5173) 登录。用 Vite 的同源代理转发 `/api`，API 通过登录会话 Cookie 识别账号。

```powershell
cd D:\code\505\frontend
npm ci
$env:VITE_STUDENT_MVP = 'true'
npm run dev
```

首次安装依赖时运行 `npm ci`。测试账号包括学生 `2022001`、`2022002`，教师 `T1001`、`T1002`，密码均为 `123456`。测试批次默认开放志愿填报七天。未启用 MVP 开关时，项目沿用原有浏览器 Mock 演示。

## 接口与验收

| 操作 | API | 权限与结果 |
| --- | --- | --- |
| 登录 | `POST /api/auth/login` | 校验数据库账号和密码，签发会话 Cookie |
| 查询实训室 | `GET /api/laboratories` | 登录后查看启用实训室 |
| 查询、保存个人简历 | `GET /api/student/resume`、`PUT /api/student/resume` | 仅登录学生本人 |
| 提交志愿 | `POST /api/preferences/submit` | 仅本人，窗口内可覆盖，成功返回已落库回执 |
| 查询回执 | `GET /api/preferences/my` | 仅本人，查询当前批次 |
| 查询实训室报名 | `GET /api/preferences/lab/{id}` | 授权教师或该室组长。每条已提交报名包含最新已保存的 `resume`，未保存时为 `null` |
| 查看面试、拟录取和个人结果 | `GET /api/student/workspace` | 仅本人，最终结果在公示发布后可见 |
| 确认拟录取 | `POST /api/student/offers/{id}/confirm` | 仅本人，窗口内确认唯一去向 |

提交志愿请求示例。编号以接口返回的实训室列表为准。

```json
{"laboratories":[1,2],"obeyInternalAdjustment":true,"obeyCollegeAdjustment":false}
```

1. 用 `2022001` 在「个人信息与简历」保存专业、技能和经历。在实训室列表确认共有六间，选择软件工程实训室并提交两项调剂意愿。在另一个浏览器重新登录同一账号，打开「我的填报」核对回执。登录 `2022002` 后应看不到前一个学生的回执。
2. 测试教师接口。软件工程实训室在新种子库中的编号为 1，`T1001` 查询后应看到报名及 `data[].resume` 中的简历，`T1002` 应收到 HTTP 403。

```powershell
$api = 'http://localhost:8080/api'
foreach ($account in 'T1001', 'T1002') {
  $body = @{ username = $account; password = '123456' } | ConvertTo-Json
  Invoke-RestMethod "$api/auth/login" -Method Post -ContentType 'application/json' -Body $body -SessionVariable login | Out-Null
  try { (Invoke-RestMethod "$api/preferences/lab/1" -WebSession $login).data }
  catch { "账号 $account 返回 HTTP $([int]$_.Exception.Response.StatusCode)" }
}
```

3. 验证面试和拟录取。在同一个 MySQL 会话中运行下列 SQL。学生刷新页面后可查看面试，进入「拟录取确认」手动确认去向。

```sql
USE lab_match;
SET @batch = (SELECT id FROM recruitment_batches WHERE batch_name = '学生端联调批次' ORDER BY id DESC LIMIT 1);
SET @student = (SELECT id FROM users WHERE username = '2022001');
SET @teacher = (SELECT id FROM users WHERE username = 'T1001');
SET @lab = (SELECT laboratory_id FROM laboratory_teachers WHERE teacher_id = @teacher LIMIT 1);

START TRANSACTION;
UPDATE recruitment_stages SET stage_status = 'COMPLETED' WHERE batch_id = @batch AND stage_number = 3;
UPDATE recruitment_stages SET stage_status = 'IN_PROGRESS', start_time = CURRENT_TIMESTAMP,
    end_time = CURRENT_TIMESTAMP + INTERVAL 1 DAY WHERE batch_id = @batch AND stage_number = 5;
INSERT INTO interviews (batch_id, student_id, laboratory_id, interviewer_id, interview_time)
SELECT @batch, @student, @lab, @teacher, CURRENT_TIMESTAMP + INTERVAL 2 HOUR
WHERE NOT EXISTS (SELECT 1 FROM interviews WHERE batch_id = @batch AND student_id = @student AND laboratory_id = @lab);
INSERT INTO admission_intentions (batch_id, student_id, laboratory_id, admission_type, confirmation_deadline)
SELECT @batch, @student, @lab, 'INTENDED', CURRENT_TIMESTAMP + INTERVAL 1 DAY
WHERE NOT EXISTS (SELECT 1 FROM admission_intentions WHERE batch_id = @batch AND student_id = @student AND laboratory_id = @lab);
COMMIT;
```

4. 学生确认后，在同一个 MySQL 会话中发布个人结果，再刷新「最终结果」。测试学生尚未确认时，以下语句不会生成公示记录。

```sql
START TRANSACTION;
INSERT IGNORE INTO final_admissions (batch_id, student_id, laboratory_id, admission_source, final_status)
SELECT batch_id, student_id, laboratory_id, 'INTENDED_CONFIRMED', 'ADMITTED'
FROM admission_intentions WHERE batch_id = @batch AND student_id = @student AND status = 'CONFIRMED';
INSERT IGNORE INTO publication (id, batch_id, title, start_at, end_at, status)
SELECT 1, @batch, '联调批次录取公示', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL 1 DAY, 'PUBLISHED'
WHERE EXISTS (SELECT 1 FROM final_admissions WHERE batch_id = @batch AND student_id = @student);
COMMIT;
```

MVP 采用手动确认拟录取和单批次验收。单份拟录取自动确认、自动递补调剂、完整教师与学院写入流程、媒体和公告接入仍是后续工作。

## 自动化接口验收

在全新初始化的测试库上，可以用后端集成测试自动执行上述流程。测试会写入志愿和录取数据，并推进测试批次。保留相同数据库连接配置，在后端目录运行：

```powershell
$env:RUN_STUDENT_MVP_IT = 'true'
mvn "-Dtest=StudentMvpIntegrationTest" test
```

## 浏览器 Mock 演示

学生端沿用统一登录和学生角色入口。启动现有 Spring Boot 服务及 Vite 前端后，在登录页使用演示学生账号 `2022001`、密码 `123456`。进入工作台后，通过「切换演示阶段」推进八阶段流程，也可选择「公示结束后」查看正式入组状态。页面时间统一显示为北京时间。

| 页面 | 路由 |
| --- | --- |
| 学生工作台 | `/student/dashboard` |
| 集中宣讲 | `/student/announcement` |
| 开放日、实训室详情、全景云游 | `/student/labs`、`/student/labs/:labId`、`/student/labs/:labId/tour` |
| 意向填报、提交回执 | `/student/application`、`/student/application/record` |
| 面试安排 | `/student/interview` |
| 拟录取确认 | `/student/admission-confirmation` |
| 分轮补录与内部调剂 | `/student/supplementary` |
| 学院统筹调剂 | `/student/allocation` |
| 最终结果与公示 | `/student/result` |
| 学院通知、个人信息与简历 | `/student/messages`、`/student/profile` |

页面组件在 `frontend/src/views/student/`，学生布局在 `frontend/src/layouts/StudentLayout.vue`，路由与菜单分别由 `frontend/src/router/index.ts` 和 `menus.ts` 接入。`studentDemo.ts` 提供实验室、通知和媒体资源结构。`frontend/src/stores/student.ts` 按演示账号保存阶段时钟、志愿草稿、提交回执、录取与调剂决定、通知已读状态和简历。

### 演示验收

1. 在意向填报阶段选择至多三个实训室，独立填写两项调剂意愿后提交。刷新页面查看回执，切换到面试阶段后验证填报已锁定，且所有已填实训室均有面试安排。
2. 同时填报嵌入式与机器人、人工智能实训室，可演示多份拟录取择一。只填其中一间，可演示单份拟录取自动确认。多份拟录取阶段未确认便进入下一阶段时，可看到逾期状态。
3. 使用另一演示学生账号，只填软件工程实训室并同意两类调剂，切到第六阶段可演示内部调剂。拒绝后进入第七阶段，可演示跨实训室调剂；接受后在第八阶段及公示结束后核对去向。
4. 浏览宣讲、开放日和全景入口，标记学院通知已读，并在个人中心保存演示简历。

初版采用浏览器 Mock 数据，填报窗口内允许修改。拟录取、面试及调剂安排均为固定样例。宣讲视频与全景容器等待学院提供素材。数据库和接口联调请使用上面的 MySQL MVP 模式。
