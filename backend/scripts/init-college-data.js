// ============ 学院实训室资料统一管理：初始化脚本 ============
// 1) 建立六个实训室基础记录（202 / 204 / 402 / 404 / 406 / 505）
//    除编号外，未知信息一律留空，不编造教师、名额、研究方向
// 2) 初始化七个登录账号（学院管理员 1 个 + 实训室组长 6 个），初始密码 123456
//    首次登录强制修改密码
//
// 可重复执行：已存在的实训室按编号复用，已存在的账号只校正角色与绑定关系，不会重复创建
//
// 用法：
//   node scripts/init-college-data.js --dry-run   仅预览，不写库
//   node scripts/init-college-data.js             执行
//   node scripts/init-college-data.js --reset-passwords  同时把七个账号密码重置为初始密码

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { getStore, persistStore, nextId, seedMockData } = require('../data/seed')
const { INITIAL_PASSWORD } = require('../utils/accountCredentials')
const { ROLES } = require('../middleware/auth')

const LAB_CODES = ['202', '204', '402', '404', '406', '505']
const ADMIN_USERNAME = 'rjxyrjxy'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const RESET_PASSWORDS = args.includes('--reset-passwords')

const log = (...parts) => console.log(...parts)

/** 实训室是否被业务数据引用 */
function labReferences(store, labId) {
  const check = {
    学生志愿: (store.studentPreferences || []).filter((i) => i.laboratoryId === labId).length,
    面试记录: (store.interviews || []).filter((i) => i.laboratoryId === labId).length,
    拟录取: (store.admissionIntentions || []).filter((i) => i.laboratoryId === labId).length,
    调剂: (store.adjustments || []).filter((i) => i.laboratoryId === labId || i.targetLaboratoryId === labId || i.sourceLaboratoryId === labId).length,
    最终名单: (store.finalAdmissions || []).filter((i) => i.laboratoryId === labId).length,
    教师档案: (store.labTeachers || []).filter((i) => i.laboratoryId === labId && !i.deletedAt).length,
    宣讲视频: (store.mediaVideos || []).filter((i) => i.laboratoryId === labId).length,
    全景资源: (store.mediaPanoramas || []).filter((i) => i.laboratoryId === labId).length,
    宣传资料: (store.labPromotionFiles || []).filter((i) => i.laboratoryId === labId).length
  }
  const total = Object.values(check).reduce((sum, n) => sum + n, 0)
  return { check, total }
}

async function main() {
  await seedMockData()
  const store = getStore()
  const changes = []

  log(`\n===== 实训室资料初始化${DRY_RUN ? '（预览模式，不写库）' : ''} =====`)
  log(`初始密码：${INITIAL_PASSWORD}（首次登录强制修改）`)

  /* ---------- 一、六个实训室 ---------- */
  log('\n--- 一、实训室基础记录 ---')
  const byCode = (code) => (store.laboratories || []).find((lab) =>
    (lab.labCode || '').trim() === code || (!lab.labCode && String(lab.name || '').trim() === code))

  // 尚未编号、且没有被任何业务引用的占位记录，可复用为缺失编号，避免凭空多出实训室
  const placeholderCandidates = (store.laboratories || [])
    .filter((lab) => !(lab.labCode || '').trim() && !/^\d{3}$/.test(String(lab.name || '').trim()))
    .filter((lab) => labReferences(store, lab.id).total === 0)

  for (const code of LAB_CODES) {
    const existing = byCode(code)
    if (existing) {
      if (!existing.labCode) {
        changes.push(`实训室 #${existing.id} 补写编号 ${code}`)
        if (!DRY_RUN) existing.labCode = code
      }
      log(`  [已存在] ${code} 实训室（#${existing.id}，名称：${existing.name || '未填写'}）`)
      continue
    }
    const placeholder = placeholderCandidates.shift()
    if (placeholder) {
      const originalName = String(placeholder.name || '').trim()
      changes.push(`占位实训室 #${placeholder.id} 复用为 ${code}，原占位名称「${originalName}」已归档到备注`)
      log(`  [复用占位] #${placeholder.id} -> ${code} 实训室（原名称「${originalName || '空'}」移入备注）`)
      if (!DRY_RUN) {
        placeholder.labCode = code
        placeholder.name = ''
        placeholder.description = ''
        placeholder.detail = ''
        placeholder.projectDirection = ''
        placeholder.technologyStack = ''
        placeholder.researchDirection = ''
        placeholder.recruitmentQuota = 0
        placeholder.briefingText = ''
        if (originalName) {
          placeholder.remark = [placeholder.remark, `初始化前占位名称：${originalName}`].filter(Boolean).join('\n')
        }
      }
      continue
    }
    changes.push(`新建实训室 ${code}（其余字段留空）`)
    log(`  [新建] ${code} 实训室（其余字段留空）`)
    if (!DRY_RUN) {
      store.laboratories.push({
        id: nextId(store.laboratories),
        labCode: code,
        name: '',
        college: '',
        location: '',
        description: '',
        detail: '',
        researchDirection: '',
        projectDirection: '',
        technologyStack: '',
        features: '',
        achievements: '',
        equipment: '',
        contact: '',
        remark: '',
        recruitmentQuota: 0,
        leaderId: null,
        briefingText: '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      })
    }
  }

  /* ---------- 二、七个账号 ---------- */
  log('\n--- 二、账号初始化 ---')
  const passwordHash = bcrypt.hashSync(INITIAL_PASSWORD, 10)

  function upsertAccount({ username, realName, role, laboratoryId }) {
    const existing = (store.users || []).find((u) => u.username === username)
    if (existing) {
      const fixes = []
      if (existing.role !== role) { fixes.push(`角色 ${existing.role} -> ${role}`); if (!DRY_RUN) existing.role = role }
      if ((existing.laboratoryId ?? null) !== (laboratoryId ?? null)) {
        fixes.push(`实训室 ${existing.laboratoryId ?? '无'} -> ${laboratoryId ?? '无'}`)
        if (!DRY_RUN) existing.laboratoryId = laboratoryId ?? null
      }
      if (existing.status !== 'ACTIVE') { fixes.push('状态 -> ACTIVE'); if (!DRY_RUN) existing.status = 'ACTIVE' }
      if (existing.deletedAt) { fixes.push('清除删除标记'); if (!DRY_RUN) delete existing.deletedAt }
      if (RESET_PASSWORDS) {
        fixes.push('重置为初始密码')
        if (!DRY_RUN) {
          existing.passwordHash = passwordHash
          existing.mustChangePassword = true
          existing.credentialVersion = (existing.credentialVersion ?? 0) + 1
        }
      }
      log(`  [已存在] ${username.padEnd(12)} ${fixes.length ? '校正：' + fixes.join('，') : '无需变更'}`)
      if (fixes.length) changes.push(`账号 ${username}：${fixes.join('，')}`)
      return existing
    }
    log(`  [新建] ${username.padEnd(12)} ${role}${laboratoryId ? ' / 实训室 #' + laboratoryId : ''}`)
    changes.push(`新建账号 ${username}（${role}${laboratoryId ? '，绑定实训室 #' + laboratoryId : ''}）`)
    if (DRY_RUN) return null
    const account = {
      id: nextId(store.users),
      username,
      realName,
      studentNumber: null,
      role,
      laboratoryId: laboratoryId ?? null,
      phone: null,
      email: null,
      passwordHash,
      mustChangePassword: true,
      credentialVersion: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    store.users.push(account)
    return account
  }

  upsertAccount({ username: ADMIN_USERNAME, realName: '学院管理员', role: ROLES.COLLEGE_ADMIN, laboratoryId: null })

  for (const code of LAB_CODES) {
    const lab = byCode(code) || (DRY_RUN ? null : (store.laboratories || []).find((l) => (l.labCode || '') === code))
    const leader = upsertAccount({
      username: `rjxy@${code}`,
      realName: `${code} 实训室组长`,
      role: ROLES.LAB_LEADER,
      laboratoryId: lab?.id ?? null
    })
    if (lab && !DRY_RUN && leader) {
      const owner = (store.users || []).find((u) => u.id === lab.leaderId)
      // 组长归属：优先使用本次初始化的七个账号；
      // 若当前组长不是这七个账号之一（历史测试账号），由新账号接管
      const ownerIsCanonical = owner && (owner.username === ADMIN_USERNAME || /^rjxy@\d{3}$/.test(owner.username))
      if (!ownerIsCanonical || owner.username === leader.username) {
        if (lab.leaderId !== leader.id) changes.push(`实训室 ${code} 组长由 ${owner ? owner.username : '未指定'} 调整为 ${leader.username}`)
        lab.leaderId = leader.id
      }
      // 教师档案的「组长 / 普通教师」身份与实训室组长保持一致
      ;(store.labTeachers || [])
        .filter((item) => item.laboratoryId === lab.id && !item.deletedAt)
        .forEach((item) => {
          const nextIdentity = item.userId != null && item.userId === lab.leaderId ? 'LEADER' : 'TEACHER'
          if (item.identity !== nextIdentity) {
            changes.push(`教师「${item.name || item.id}」身份调整为 ${nextIdentity}`)
            item.identity = nextIdentity
          }
        })
    }
  }

  /* ---------- 三、落库 ---------- */
  log('\n--- 三、结果 ---')
  if (DRY_RUN) {
    log(`  预览：共 ${changes.length} 项待变更，未写入数据库`)
  } else {
    persistStore(store)
    log(`  已写入数据库，共 ${changes.length} 项变更`)
  }
  const labs = (store.laboratories || []).filter((lab) => (lab.labCode || '').trim())
  log(`  当前实训室：${labs.map((lab) => `${lab.labCode}${lab.name ? '(' + lab.name + ')' : ''}`).join('、') || '无'}`)
  const accounts = (store.users || []).filter((u) => u.username === ADMIN_USERNAME || /^rjxy@\d{3}$/.test(u.username))
  log(`  七个账号：${accounts.map((u) => `${u.username}(${u.role})`).join('、') || '未创建'}`)
  if (changes.length) log(`\n变更明细：\n - ${changes.join('\n - ')}`)
  log('\n完成。')
}

main().catch((error) => {
  console.error('[init] 初始化失败：', error)
  process.exit(1)
})
