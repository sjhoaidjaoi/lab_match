import request from './request'

// 枚举与阶段模板：后端 /api/meta 已可用，前端可据此替换本地常量
export const getEnums = () => request.get('/meta/enums')
export const getStageTemplates = () => request.get('/meta/stages')

// 批次与规则开关：Q6/Q7/Q8 等未定规则统一从这里读，页面不再写死
export const getBatches = () => request.get('/meta/batches')
export const getConfig = () => request.get('/meta/config')
