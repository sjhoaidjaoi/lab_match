import { MockError } from './auth'
import type {
  StudentCreateReq,
  StudentImportResult,
  StudentListItem,
  StudentSaveReq
} from '@/types/basic'

const MOCK_DELAY_MS = 250

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let students: StudentListItem[] = [
  {
    id: 1001,
    userId: 1001,
    userNo: '20220001',
    realName: '陈爱丽',
    college: '计算机学院',
    major: '软件工程',
    grade: '2022',
    phone: '13800000001',
    email: 'chenaili@example.com',
    status: 1,
    needChangePwd: 0
  },
  {
    id: 1002,
    userId: 1002,
    userNo: '20220002',
    realName: '刘婷',
    college: '计算机学院',
    major: '软件工程',
    grade: '2022',
    phone: '13800000002',
    email: 'liuting@example.com',
    status: 1,
    needChangePwd: 1
  },
  {
    id: 1003,
    userId: 1003,
    userNo: '20220003',
    realName: '张浩然',
    college: '计算机学院',
    major: '数据科学与大数据技术',
    grade: '2022',
    phone: '13800000003',
    email: 'zhanghaoran@example.com',
    status: 1,
    needChangePwd: 0
  },
  {
    id: 1004,
    userId: 1004,
    userNo: '20220004',
    realName: '王雨欣',
    college: '信息工程学院',
    major: '通信工程',
    grade: '2022',
    phone: '13800000004',
    email: 'wangyuxin@example.com',
    status: 0,
    needChangePwd: 1
  },
  {
    id: 1005,
    userId: 1005,
    userNo: '20230011',
    realName: '李思远',
    college: '计算机学院',
    major: '人工智能',
    grade: '2023',
    phone: '13800000011',
    email: 'lisiyuan@example.com',
    status: 1,
    needChangePwd: 1
  },
  {
    id: 1006,
    userId: 1006,
    userNo: '20230012',
    realName: '赵倩',
    college: '网络空间安全学院',
    major: '网络工程',
    grade: '2023',
    phone: '13800000012',
    email: 'zhaoqian@example.com',
    status: 1,
    needChangePwd: 0
  }
]

const importRows: StudentCreateReq[] = [
  {
    userNo: '20220021',
    realName: '林嘉',
    college: '计算机学院',
    major: '软件工程',
    grade: '2022',
    phone: '13800000021',
    email: 'linjia@example.com',
    status: 1
  },
  {
    userNo: '20220022',
    realName: '郑雨',
    college: '计算机学院',
    major: '数据科学与大数据技术',
    grade: '2022',
    phone: '13800000022',
    email: 'zhengyu@example.com',
    status: 1
  },
  {
    userNo: '20220001',
    realName: '陈爱丽',
    college: '计算机学院',
    major: '软件工程',
    grade: '2022',
    phone: '13800000001',
    email: 'chenaili@example.com',
    status: 1
  }
]

function nextId(): number {
  return Math.max(...students.map((item) => item.id), 1000) + 1
}

export async function mockStudentList(keyword?: string, status?: number | ''): Promise<StudentListItem[]> {
  await delay()
  const text = keyword?.trim() ?? ''
  const list = students.filter((item) => {
    const matchKeyword = !text || item.userNo.includes(text) || item.realName.includes(text)
    const matchStatus = status === '' || status === undefined || item.status === status
    return matchKeyword && matchStatus
  })
  return deepCopy(list)
}

export async function mockCreateStudent(payload: StudentCreateReq): Promise<number> {
  await delay()
  if (students.some((item) => item.userNo === payload.userNo)) {
    throw new MockError(400002, '学号已存在')
  }
  const id = nextId()
  students.unshift({
    id,
    userId: id,
    userNo: payload.userNo,
    realName: payload.realName,
    college: payload.college || null,
    major: payload.major || null,
    grade: payload.grade || null,
    phone: payload.phone || null,
    email: payload.email || null,
    status: payload.status,
    needChangePwd: 1
  })
  return id
}

export async function mockUpdateStudent(id: number, payload: StudentSaveReq): Promise<void> {
  await delay()
  const student = students.find((item) => item.id === id)
  if (!student) {
    throw new MockError(404001, '学生账号不存在')
  }
  student.realName = payload.realName
  student.college = payload.college || null
  student.major = payload.major || null
  student.grade = payload.grade || null
  student.phone = payload.phone || null
  student.email = payload.email || null
  student.status = payload.status
}

export async function mockUpdateStudentStatus(id: number, status: number): Promise<void> {
  await delay()
  const student = students.find((item) => item.id === id)
  if (!student) {
    throw new MockError(404001, '学生账号不存在')
  }
  student.status = status
}

export async function mockResetStudentPassword(id: number): Promise<void> {
  await delay()
  const student = students.find((item) => item.id === id)
  if (!student) {
    throw new MockError(404001, '学生账号不存在')
  }
  student.needChangePwd = 1
}

export async function mockImportStudents(fileName: string): Promise<StudentImportResult> {
  await delay()
  if (!fileName) {
    throw new MockError(400001, '请选择要导入的 Excel 文件')
  }
  const failList: StudentImportResult['failList'] = []
  let successCount = 0
  importRows.forEach((row, index) => {
    if (students.some((item) => item.userNo === row.userNo)) {
      failList.push({ row: index + 2, userNo: row.userNo, reason: '学号已存在' })
      return
    }
    const id = nextId()
    students.unshift({
      id,
      userId: id,
      userNo: row.userNo,
      realName: row.realName,
      college: row.college || null,
      major: row.major || null,
      grade: row.grade || null,
      phone: row.phone || null,
      email: row.email || null,
      status: row.status,
      needChangePwd: 1
    })
    successCount += 1
  })
  return {
    successCount,
    failCount: failList.length,
    failList,
    failFileUrl: failList.length > 0 ? '/files/import/student-fail-20261110.xlsx' : null
  }
}
