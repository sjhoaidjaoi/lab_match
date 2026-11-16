// ============ 列表分页工具 ============
// 约定：请求带 page（从 1 开始）时返回 { list, total, page, pageSize, totalPages }
//       未带 page 时保持原样返回数组，兼容既有前端调用
function paginate(list, req, defaultPageSize = 20) {
  const page = Number(req.query.page || 0)
  if (!page || page < 1) return list
  const size = Math.min(Math.max(Number(req.query.pageSize) || defaultPageSize, 1), 200)
  const total = list.length
  const start = (page - 1) * size
  return {
    list: list.slice(start, start + size),
    total,
    page,
    pageSize: size,
    totalPages: Math.ceil(total / size)
  }
}

module.exports = { paginate }
