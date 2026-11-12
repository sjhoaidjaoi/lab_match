// 与 backend/src/constants/enums.js 保持一致；改枚举必须双端同时改并跑 smoke
export const STATUS_META = {
  SUBMITTED: { label: '已提交', type: 'info' },
  PENDING: { label: '待处理', type: 'warning' },
  EVALUATED: { label: '已评价', type: 'success' },
  ABSENT: { label: '缺勤', type: 'danger' },
  PARTIAL: { label: '部分评价', type: 'warning' },
  CONFIRMED: { label: '已确认', type: 'success' },
  ABANDONED: { label: '已放弃', type: 'danger' },
  RELEASED: { label: '已释放', type: 'info' },
  ADMITTED: { label: '已录取', type: 'success' },
  ALTERNATE: { label: '递补', type: 'warning' },
  DRAFT: { label: '草稿', type: 'info' },
  REVIEWING: { label: '待审核', type: 'warning' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已退回', type: 'danger' },
  NOT_STARTED: { label: '未开始', type: 'info' },
  IN_PROGRESS: { label: '进行中', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  PAUSED: { label: '已暂停', type: 'info' }
}

export const RECOMMENDATION_META = {
  ADMIT: { label: '建议拟录取', type: 'success' },
  ALTERNATE: { label: '建议递补', type: 'warning' },
  REJECT: { label: '不建议', type: 'danger' }
}

export const LOG_LABELS = {
  ADMISSION_ADD: '名单增补',
  ADMISSION_REMOVE: '名单移出',
  CONFIRM: '学生确认',
  ABANDON: '超时放弃',
  ADJUSTMENT_SUBMIT: '调剂提交',
  ADJUSTMENT_CONFIRM: '调剂确认',
  SUBMIT: '提交审核',
  REVIEW_APPROVE: '审核通过',
  REVIEW_REJECT: '审核退回',
  REVIEW: '面试复评',
  LAB_INFO: '本室信息'
}

export const LOG_TAGS = {
  ADMISSION_ADD: 'success',
  ADMISSION_REMOVE: 'warning',
  CONFIRM: 'success',
  ABANDON: 'danger',
  ADJUSTMENT_SUBMIT: 'warning',
  ADJUSTMENT_CONFIRM: 'success',
  SUBMIT: 'primary',
  REVIEW_APPROVE: 'success',
  REVIEW_REJECT: 'danger',
  REVIEW: 'info',
  LAB_INFO: 'info'
}
