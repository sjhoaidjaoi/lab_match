// E宝 站内问答的本地话术（大模型不可用时的兜底，也是首次进入的引导）
// 口径必须与后端 system prompt 保持一致，否则「AI 说一套、兜底说另一套」会让学生困惑。

export type EbaRole = 'student' | 'teacher' | 'leader' | 'college'

export interface EbaReply {
  keys: string[]
  text: string
  /** 只对特定角色生效；不填表示全角色通用 */
  roles?: EbaRole[]
}

export function roleOf(roleCode: string, roleName = ''): EbaRole {
  /* 优先用后端下发的中文角色名判断：角色码是内部常量，不适合在前端做字符串匹配 */
  const label = String(roleName || '')
  if (label.includes('学生')) return 'student'
  if (label.includes('学院')) return 'college'
  if (label.includes('组长')) return 'leader'
  if (label.includes('教师')) return 'teacher'

  const code = String(roleCode || '').toUpperCase()
  if (code.includes('STUDENT')) return 'student'
  if (code.includes('COLLEGE')) return 'college'
  if (code.includes('LEADER')) return 'leader'
  return 'teacher'
}

const REPLIES: EbaReply[] = [
  {
    keys: ['你好', '您好', 'hi', 'hello', '嗨', '在吗', '在么'],
    text: '你好呀，我是 E宝 👋 流程、规则、入口都可以问我，也可以直接点下面的快捷问题。'
  },
  {
    keys: ['谢谢', '好的', '收到', '辛苦', '明白'],
    text: '不客气～ 有需要随时点我，E宝一直在右下角。'
  },
  {
    keys: ['再见', '拜拜', '走了'],
    text: '拜拜，祝你顺利进组 👋'
  },
  {
    keys: ['你能做什么', '你会', '能干嘛', '功能', '你是谁', '怎么用你'],
    text: '我会讲八阶段流程、解释志愿与调剂规则、告诉你去哪个页面操作。问得越具体，我答得越准。'
  },
  {
    keys: ['志愿', '填报', '几个', '平行'],
    text: '最多 3 个平行志愿，志愿之间不分先后。另外要分别选「是否服从实训室内部调剂」和「是否服从学院统筹调剂」，这两个是独立开关。',
    roles: ['student']
  },
  {
    keys: ['志愿', '填报'],
    text: '学生在「志愿填报」页最多填 3 个平行志愿，并分别选择内部调剂、学院统筹调剂两项意愿。',
  },
  {
    keys: ['八阶段', '流程', '阶段', '几步', '怎么走', '什么时候'],
    text: '八个阶段：集中宣讲 → 开放日 → 志愿填报 → 面试 → 拟录取确认 → 分轮补录 → 统筹调剂录取 → 公示入组。具体时间看顶部「当前阶段」卡片。'
  },
  {
    keys: ['面试', '考核', '打分'],
    text: '面试由实训室组织、按维度打分。组长面完在「面试管理」里录分并报送名单，报送后立即同步学院端，不需要学院再审核。'
  },
  {
    keys: ['调剂', '补录', '没选上', '落选', '没被录取', '统筹'],
    text: '第一轮录取后会公布各实训室剩余名额，没被录取可以重新填报参加第二、三轮补录；三轮后剩余名额进全院调剂池，按「本室内部 → 跨室统筹 → 未服从调剂者学院安置」处理。'
  },
  {
    keys: ['名额', '剩余', '满了', '超额', '人数'],
    text: '剩余名额 = 学年计划 − 已录取 − 待确认。有人放弃会释放名额并递补，系统不会超额录取。学院端「各实训室剩余名额」页可看实时数字。'
  },
  {
    keys: ['确认', '录取', 'offer', '拟录取'],
    text: '进入「拟录取确认」后，看到录取通知要在截止时间前确认；逾期未确认按放弃处理，名额会释放给后面的人。',
    roles: ['student']
  },
  {
    keys: ['登录', '账号', '密码', '怎么进', '注册'],
    text: '学生用学号、老师用工号登录。初始密码首次登录会强制改密；忘了密码联系学院管理员重置。'
  },
  {
    keys: ['报送', '名单', '提交'],
    text: '在「结果报送」里汇总本室拟录取名单后提交，提交即生效并同步学院端；学院端只做展示和后续公示，不再有二次审核环节。',
    roles: ['leader', 'teacher']
  },
  {
    keys: ['批次', '阶段时间', '调整时间', '暂停', '开放'],
    text: '在「基础配置 → 批次与阶段」里可以建批次、调每个阶段的时间窗、暂停或提前结束。阶段状态由时间窗实时推导，到点自动锁定。',
    roles: ['college']
  },
  {
    keys: ['公示', '最终名单', '汇总', '导出'],
    text: '在「调剂与录取 → 汇总与公示」里查看最终名单并公示；名单由各环节确认结果自动汇总，不需要手工合并。',
    roles: ['college']
  },
  {
    keys: ['实训室', '资料', '教师档案', '名额设置'],
    text: '学院端「实训室管理」里点进具体实训室，可以改基础资料、维护教师档案和学年名额；宣传物料（PPT / 视频）由该室组长维护。',
    roles: ['college']
  },
  {
    keys: ['物料', '宣传', 'ppt', '视频', '海报'],
    text: '宣传物料归各实训室组长维护，在「实训室资料」里上传；学院端只做查看，不代为维护。',
    roles: ['leader', 'teacher']
  }
]

const FALLBACKS: Record<EbaRole, string> = {
  student: '这个我查不到依据，就不瞎猜了～ 具体数字可以到「各实训室剩余名额」「我的录取结果」页看实时数据；流程问题可以问我「怎么填志愿」「没被录取怎么办」。',
  teacher: '这个我查不到依据，就不瞎猜了～ 面试和名额的实时数据在对应页面里；规则问题可以问我「面试怎么打分」「名额怎么算」。',
  leader: '这个我查不到依据，就不瞎猜了～ 本室数据在「面试管理」「结果报送」页里；规则问题可以问我「名单怎么报送」「名额怎么算」。',
  college: '这个我查不到依据，就不瞎猜了～ 实时数据在「各实训室剩余名额」「全院调剂池」「汇总与公示」页里；规则问题可以问我「怎么建批次」「阶段时间怎么调」。'
}

export function localAnswer(input: string, role: EbaRole): string {
  const text = String(input || '').toLowerCase()
  const hit = REPLIES.find((item) =>
    (!item.roles || item.roles.includes(role)) && item.keys.some((key) => text.includes(key))
  )
  return hit ? hit.text : FALLBACKS[role]
}

const GREETINGS: Record<EbaRole, string> = {
  student: '你好呀，我是 E宝 👋 志愿怎么填、现在到哪一步，都可以问我。',
  teacher: '你好，我是 E宝 👋 面试评分、名单报送的问题都可以问我。',
  leader: '你好，我是 E宝 👋 面试、报送、名额和宣传物料的事都能问我。',
  college: '你好，我是 E宝 👋 批次、阶段、调剂池和公示的问题都可以问我。'
}

export function greetingFor(role: EbaRole): string {
  return GREETINGS[role]
}

const BRIEFS = ['我在～ 还想问点什么？', '还需要我讲哪一块？', '随时问我，流程规则都行。']

export function briefLine(): string {
  return BRIEFS[Math.floor(Math.random() * BRIEFS.length)]
}

export function quickQuestions(role: EbaRole): string[] {
  if (role === 'student') return ['现在第几阶段', '怎么填志愿', '没被录取怎么办', '在哪确认录取']
  if (role === 'leader') return ['怎么报送名单', '面试怎么打分', '名额怎么算', '物料在哪上传']
  if (role === 'college') return ['怎么建批次', '阶段时间怎么调', '调剂池怎么用', '最终名单在哪看']
  return ['面试怎么打分', '怎么报送名单', '名额怎么算']
}
