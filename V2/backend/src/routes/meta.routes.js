import { Router } from 'express'
import { ENUMS } from '../constants/enums.js'
import { ok } from '../utils/response.js'
import { getCurrentStage, listStages } from '../services/stage.service.js'

const router = Router()

// 枚举公开可读，前端可据此渲染标签，避免两边各写一份
router.get('/enums', (req, res) => ok(res, ENUMS))

// 阶段模板：真实时间由学院端配置，这里只返回结构与名称，避免前端写死 8 个标题
router.get('/stages', (req, res) =>
  ok(res, {
    total: 8,
    list: [
      { no: 1, name: '集中宣讲' },
      { no: 2, name: '实训室开放日' },
      { no: 3, name: '学生意向填报' },
      { no: 4, name: '导师初选与面试考核' },
      { no: 5, name: '拟录取与学生确认' },
      { no: 6, name: '分轮补录（内部调剂）' },
      { no: 7, name: '统筹调剂录取' },
      { no: 8, name: '结果公示与正式入组' }
    ]
  })
)

router.get('/stage', (req, res) => ok(res, { current: getCurrentStage(), stages: listStages() }))

// 批次列表：真实数据由学院端维护，这里先给出契约结构
router.get('/batches', (req, res) =>
  ok(res, {
    list: [
      {
        id: 1,
        batchName: '2026 年软件学院实训室选拔',
        academicYear: '2026-2027',
        status: 'RUNNING',
        current: true
      }
    ]
  })
)

/**
 * 规则与功能开关（Q6/Q7/Q8 等未定事项集中在这里，避免前端写死）
 * 学院端/公共模块确定规则后只需改返回值，前端按开关渲染。
 */
router.get('/config', (req, res) =>
  ok(res, {
    currentBatchId: 1,
    rules: {
      // 需求文档第十一节问题 6：内部调剂候选是否只来自本室报名学生
      internalAdjustmentOnlyOwnApplicants: true,
      // 问题 7：内部调剂是否必须学生再次确认
      requireStudentConfirmForAdjustment: true,
      // 问题 8：跨室调剂是否允许进入未填报的实训室
      crossLabAdjustmentAllowsUnapplied: false,
      // 学生是否可在截止前修改志愿
      allowEditPreferencesBeforeDeadline: true,
      // 名额调整是否需要学院审批
      quotaAdjustmentNeedsApproval: true
    },
    features: {
      upload: false,
      panorama: false,
      notification: false,
      excelExport: false
    }
  })
)

export default router
