const labels: Record<string, string> = { ENROLLED: '已正式入组', ADMITTED: '已录取，待正式入组', UNPLACED: '未落实去向' }
export const rosterStatus = (value: string) => labels[value] || value
