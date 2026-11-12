# 项目框架与接口约定

本目录用于维护前后端共同的接口字段、状态枚举、权限点和联调记录。

## 统一枚举

- 角色：`STUDENT`、`LAB_TEACHER`、`LAB_LEADER`、`COLLEGE_ADMIN`
- 批次：`DRAFT`、`NOT_STARTED`、`IN_PROGRESS`、`COMPLETED`、`ARCHIVED`
- 阶段：`PENDING`、`NOT_STARTED`、`OPEN`、`CLOSED`、`COMPLETED`
- 申请：`DRAFT`、`SUBMITTED`、`WITHDRAWN`、`UNDER_REVIEW`、`INTERVIEWED`、`RECOMMENDED`、`WAITLISTED`、`NOT_ADMITTED`、`ADMITTED`
- 确认：`PENDING`、`AUTO_CONFIRMED`、`CONFIRMED`、`DECLINED`、`EXPIRED`
- 调剂：`INTERNAL`、`CROSS_LAB`；状态为 `PENDING`、`PROPOSED`、`ACCEPTED`、`REJECTED`、`COMPLETED`、`CANCELLED`

## 响应结构

```json
{ "code": 200, "message": "success", "data": {}, "timestamp": 0 }
```

分页 `data` 为 `{ "records": [], "total": 0, "current": 1, "size": 10 }`。

不确定的评分、顺位、撤回、自动确认与公示隐私规则必须由学院确认后再落地。
