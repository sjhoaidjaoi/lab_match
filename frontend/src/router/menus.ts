import { collegeTools, collegeWorkflows } from './collegeModules'
import { studentMvp } from '@/api/studentMvp'

export interface MenuItem {
  path: string
  title: string
  icon: string
  children?: MenuItem[]
}

const map = (prefix: string, items: string[][]): MenuItem[] =>
  items.map(([path, title, icon]) => ({ path: `/${prefix}/${path}`, title, icon }))

const group = (prefix: string, title: string, icon: string, items: string[][]): MenuItem => ({
  path: '',
  title,
  icon,
  children: map(prefix, items)
})

export const menus: Record<string, MenuItem[]> = {
  STUDENT: [
    ...map('student', [['dashboard', '工作台', 'HomeFilled']]),
    group('student', '了解实训室', 'OfficeBuilding', [
      ...(studentMvp ? [] : [['announcement', '查看集中宣讲', 'VideoCamera']]),
      ['labs', studentMvp ? '浏览实训室' : '参加开放日', 'OfficeBuilding']
    ]),
    group('student', '志愿与面试', 'EditPen', [
      ['application', '填报志愿', 'EditPen'],
      ...(studentMvp ? [['application/record', '查看填报回执', 'Document']] : []),
      ['interview', '查看面试安排', 'Calendar']
    ]),
    group('student', '录取与结果', 'CircleCheck', [
      ['admission-confirmation', '确认拟录取', 'CircleCheck'],
      ...(studentMvp ? [] : [['supplement', '填报补录志愿', 'Refresh'], ['allocation', '查看调剂结果', 'Connection']]),
      ['result', '查看最终结果', 'Trophy']
    ])
  ],
  LAB_TEACHER: [
    ...map('teacher', [['dashboard', '工作台', 'HomeFilled']]),
    group('teacher', '报名与面试', 'Calendar', [
      ['applications', '查看报名学生', 'User'], ['interviews', '办理面试', 'Calendar'],
      ['interview-archives', '查看面试档案', 'VideoCamera']
    ]),
    group('teacher', '录取与成员', 'CircleCheck', [
      ['confirmation-status', '查看确认进度', 'CircleCheck'], ['lab-members', '查看小组成员', 'UserFilled']
    ]),
    ...map('teacher', [['lab-info', '本室资料', 'OfficeBuilding']])
  ],
  LAB_LEADER: [
    ...map('leader', [['dashboard', '工作台', 'HomeFilled']]),
    group('leader', '学生与面试', 'User', [
      ['lab-selection', '查看学生汇总', 'DataAnalysis'], ['online-interviews', '进入线上面试', 'VideoCamera'],
      ['interview-archives', '查看面试档案', 'Files'], ['lab-selection?tab=confirmation', '录取确认', 'CircleCheck'],
      ['lab-selection?tab=lists', '名单与报送', 'List'], ['lab-selection?tab=alternates', '候补名单', 'Tickets']
    ]),
    group('leader', '实训室事务', 'OfficeBuilding', [
      ['lab-info', '本室与教师信息', 'OfficeBuilding'],
      ['lab-info?tab=files', '宣传资料', 'Folder'], ['lab-info?tab=media', '宣讲与开放日', 'VideoCamera']
    ])
  ],
  COLLEGE_ADMIN: [
    { path: '/college/dashboard', title: '全院总览', icon: 'HomeFilled' },
    ...collegeWorkflows.map(group => ({
      title: group.title, path: '', icon: group.icon,
      children: group.modules.map(module => ({ title: module.title, path: module.links[0].path, icon: module.icon }))
    })),
    { title: '统计与服务', path: '', icon: 'Tools', children: collegeTools }
  ]
}
