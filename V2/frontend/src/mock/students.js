import { labName } from './labs'

const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '朱', '胡', '郭', '何', '高', '林', '罗', '郑']
const GIVEN = ['明', '思远', '雨桐', '子涵', '浩然', '若曦', '一鸣', '嘉怡', '子豪', '梦琪', '文博', '雪宁', '俊杰', '佳宁', '子轩', '雨欣', '文杰', '可欣', '宇航', '思彤']

// 400 名学生，与总名额 400 一一对应；每人三个平行志愿，均匀分布到 6 个实训室
const MAJORS = ['软件工程', '计算机科学与技术', '人工智能', '网络工程']
const SKILLS = ['Python', 'C++', 'Java', 'Vue', 'PyTorch', 'ROS', 'MySQL', 'Linux', 'Git', 'OpenCV', 'Go', 'Unity']
const PROJECTS = [
  { name: '基于 YOLO 的目标检测课程设计', role: '算法', desc: '完成数据集标注与模型训练，mAP 提升 6%' },
  { name: '校园二手交易平台', role: '全栈', desc: 'Vue3 + Express 实现商品、订单与聊天模块' },
  { name: 'ROS 小车循迹与避障', role: '负责人', desc: '负责感知与运动控制联调，完成赛道实测' },
  { name: '电影推荐系统', role: '后端', desc: '协同过滤 + 特征工程，离线评估 Recall@10' },
  { name: '嵌入式环境监测终端', role: '嵌入式', desc: 'STM32 采集温湿度并通过 MQTT 上报' }
]

function buildResume(i) {
  const major = MAJORS[i % MAJORS.length]
  const skills = [...new Set(Array.from({ length: 5 }, (_, k) => SKILLS[(i + k * 3) % SKILLS.length]))]
  const projects = [PROJECTS[i % PROJECTS.length], PROJECTS[(i + 2) % PROJECTS.length]].map((p) => ({
    ...p,
    tech: skills.slice(0, 2).join(' / ')
  }))
  return {
    gender: i % 2 === 0 ? '男' : '女',
    major,
    grade: '2025 级',
    gpa: (3.1 + ((i * 7) % 9) * 0.1).toFixed(1),
    skills,
    projects,
    selfIntro: `${major}专业，熟悉 ${skills.slice(0, 3).join('、')}，有课程项目与竞赛经历，每周可稳定投入 ${10 + (i % 6)} 小时。`,
    // 不批量生成假附件；真实 PDF 由学生上传，前端只预留位置
    attachments: []
  }
}

export const students = Array.from({ length: 400 }, (_, i) => {
  const prefs = [(i % 6) + 1, ((i + 1) % 6) + 1, ((i + 2) % 6) + 1]
  return {
    id: i + 1,
    studentNumber: `2025017${String(i + 1).padStart(4, '0')}`,
    realName: SURNAMES[i % 20] + GIVEN[Math.floor(i / 20) % 20],
    phone: `1380013${String(1000 + i).slice(-4)}`,
    preferences: prefs.map((labId) => ({ labId, labName: labName(labId) })),
    obeyInternal: i % 4 !== 0,
    obeyCollege: i % 3 !== 0,
    resume: buildResume(i)
  }
})