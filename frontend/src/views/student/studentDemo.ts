import type { PanoramaItem, VideoItem } from '@/types'

export const labs = [
  { id: 1, name: '嵌入式与机器人实训室', leader: '陈老师', direction: '嵌入式系统、机器人感知与控制', tools: 'C / C++、STM32、ROS 2', quota: 12, room: '实训楼 A201', equipment: '机器人底盘、示波器、嵌入式开发板', project: '完成移动机器人传感器接入与运动控制演示。', requirement: '具备 C 语言基础，能参加每周例会。', training: '从硬件接口实验开始，随后分组完成机器人任务。', assessment: '实验记录、阶段演示和团队项目验收。' },
  { id: 2, name: '人工智能实训室', leader: '王老师', direction: '计算机视觉与机器学习', tools: 'Python、PyTorch、OpenCV', quota: 10, room: '实训楼 A305', equipment: 'GPU 工作站、摄像头、边缘计算设备', project: '构建图像识别原型，提交模型评估报告。', requirement: '具备 Python 基础，愿意学习数据标注与实验复现。', training: '依次开展数据处理、模型训练和部署实验。', assessment: '训练日志、评估报告和项目答辩。' },
  { id: 3, name: '软件工程实训室', leader: '刘老师', direction: 'Web 应用开发与工程实践', tools: 'Vue 3、Java、MySQL', quota: 15, room: '实训楼 B102', equipment: '开发工作站、项目协作与持续集成环境', project: '分组完成一套可部署的校园信息管理应用。', requirement: '掌握一门编程语言，能使用 Git 完成团队协作。', training: '分组完成需求分析、编码、测试和上线演练。', assessment: '代码评审、测试结果和迭代交付。' },
  { id: 4, name: '数据工程实训室', leader: '赵老师', direction: '数据处理与可视化', tools: 'Python、SQL、ECharts', quota: 8, room: '实训楼 B306', equipment: '数据分析工作站、数据仓库实验环境', project: '建立数据清洗流程并交付可视化报告。', requirement: '具备 SQL 或 Python 基础。', training: '完成采集、清洗、分析和展示四项实践。', assessment: '数据质量、分析报告和项目演示。' },
  { id: 5, name: '物联网实训室', leader: '周老师', direction: '物联网应用', tools: 'ESP32、MQTT', quota: 5, room: '实训楼 C201', equipment: '传感器与开发板', project: '制作环境监测终端。', requirement: '具备基础编程能力。', training: '完成传感器采集和数据上报。', assessment: '设备演示和实验记录。' },
  { id: 6, name: '数字媒体实训室', leader: '李老师', direction: '互动内容与三维开发', tools: 'Godot、Blender', quota: 5, room: '实训楼 C306', equipment: '图形工作站', project: '制作可交互的三维原型。', requirement: '具备基础编程或三维建模能力。', training: '完成场景搭建和交互开发。', assessment: '原型演示和项目说明。' }
]

export const announcements = [
  { id: 'briefing', stage: 1, title: '集中宣讲与项目资料', content: '请先阅读实训室项目介绍，再观看已发布的视频。宣讲期间可向对应实训室教师咨询培养安排。' },
  { id: 'visit', stage: 2, title: '实训室开放日安排', content: '开放日可前往各实训室现场参观。演示安排为开放日当天 14:00–16:00，请在对应实训室门口集合。' },
  { id: 'preferences', stage: 3, title: '平行志愿填报须知', content: '最多选择三个不同实训室，志愿之间没有优先级。请分别选择是否服从实训室内部调剂和学院跨实训室调剂。' }
]

export const studentLinks = [
  '/student/announcement', '/student/labs', '/student/application', '/student/interview',
  '/student/admission-confirmation', '/student/supplementary', '/student/allocation', '/student/result'
]

export function labName(id: number) {
  return labs.find(lab => lab.id === id)?.name ?? '待安排'
}

export function formatTime(value: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai'
  }).format(value)
}


// Media is supplied by the college when available.
export const videos: VideoItem[] = []
export const panoramas: PanoramaItem[] = []
