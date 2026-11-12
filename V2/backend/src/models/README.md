# models 目录

第二阶段在此放置数据访问层，与 `database/schema.sql` 一一对应：

- user.model.js
- laboratory.model.js
- batch.model.js
- stage.model.js
- preference.model.js
- interview.model.js
- admission.model.js
- adjustment.model.js
- finalAdmission.model.js
- operationLog.model.js

约定：Model 只做 SQL 与行映射，不含业务判断；业务规则放 `services/`。
