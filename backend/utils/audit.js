// ============ 操作日志工具（文档 5.10 节） ============
// 所有涉及录取名单、调剂名单、阶段状态和重要权限的操作均应保留日志

function nextLogId(list) {
  if (!list || list.length === 0) return 1
  return Math.max(...list.map((i) => i.id || 0)) + 1
}

/**
 * 写入一条操作日志（调用方负责 persistStore）
 * @param {object} store Mock 数据仓库
 * @param {object} req Express 请求（取当前操作人）
 * @param {{operationType:string,targetType:string,targetId?:number|null,description:string}} payload
 */
function logOperation(store, req, payload) {
  if (!store.operationLogs) store.operationLogs = []
  store.operationLogs.push({
    id: nextLogId(store.operationLogs),
    operatorId: req?.user?.uid ?? null,
    operationType: payload.operationType,
    targetType: payload.targetType,
    targetId: payload.targetId ?? null,
    operationDescription: payload.description,
    createdAt: new Date().toISOString()
  })
}

module.exports = { logOperation }
