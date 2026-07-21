import { computed, reactive, readonly } from 'vue'
import { loadJSON, saveJSON } from '../utils/storage'

const OA_KEY = 'oa-demo-data'

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
const today = new Date()
const formatDate = (date) => date.toLocaleString('zh-CN', { hour12: false })
const currentDay = () => today.toISOString().slice(0, 10)

const fallback = {
  departments: [
    { id: 'd1', name: '信息中心', manager: '系统管理员', people: 6 },
    { id: 'd2', name: '人力资源部', manager: '林雨晴', people: 4 },
    { id: 'd3', name: '研发部', manager: '周启明', people: 14 },
    { id: 'd4', name: '行政部', manager: '韩晓宁', people: 5 }
  ],
  employees: [
    { id: 'u1', name: '系统管理员', jobNo: 'EMP-0001', department: '信息中心', role: '超级管理员', status: '在岗', phone: '13800000001' },
    { id: 'u2', name: '林雨晴', jobNo: 'EMP-0002', department: '人力资源部', role: 'HR 人事', status: '在岗', phone: '13800000002' },
    { id: 'u3', name: '周启明', jobNo: 'EMP-0003', department: '研发部', role: '部门主管', status: '在岗', phone: '13800000003' },
    { id: 'u4', name: '陈思远', jobNo: 'EMP-0004', department: '研发部', role: '普通员工', status: '在岗', phone: '13800000004' },
    { id: 'u5', name: '宋佳宁', jobNo: 'EMP-0005', department: '行政部', role: '普通员工', status: '试用', phone: '13800000005' }
  ],
  attendance: [
    { id: uid(), employee: '陈思远', department: '研发部', type: '上班打卡', time: `${currentDay()} 08:59:12`, result: '正常', note: '定位校验通过' },
    { id: uid(), employee: '陈思远', department: '研发部', type: '下班打卡', time: `${currentDay()} 18:07:18`, result: '正常', note: '完成当日考勤' },
    { id: uid(), employee: '周启明', department: '研发部', type: '上班打卡', time: `${currentDay()} 09:06:04`, result: '迟到', note: '迟到 6 分钟' }
  ],
  approvals: [
    { id: uid(), applicant: '陈思远', type: '请假申请', days: '1 天', reason: '家庭事务处理', status: '待审批', approver: '周启明', createdAt: formatDate(new Date()) },
    { id: uid(), applicant: '宋佳宁', type: '加班申请', days: '2 小时', reason: '活动物料整理', status: '已通过', approver: '韩晓宁', createdAt: formatDate(new Date(Date.now() - 86400000)) },
    { id: uid(), applicant: '林雨晴', type: '请假申请', days: '0.5 天', reason: '医院复诊', status: '已驳回', approver: '系统管理员', createdAt: formatDate(new Date(Date.now() - 172800000)) }
  ],
  notices: [
    { id: uid(), title: '关于本周五系统联调安排的通知', scope: '全员', status: '已发布', publisher: '系统管理员', createdAt: formatDate(new Date()) },
    { id: uid(), title: '研发部代码评审时间调整', scope: '研发部', status: '已发布', publisher: '周启明', createdAt: formatDate(new Date(Date.now() - 86400000)) }
  ]
}

const saved = loadJSON(OA_KEY, null)
const dataKeys = ['departments', 'employees', 'attendance', 'approvals', 'notices']

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createInitialState(source) {
  return dataKeys.reduce((result, key) => {
    result[key] = Array.isArray(source?.[key]) ? source[key] : clone(fallback[key])
    return result
  }, {})
}

const state = reactive(createInitialState(saved))

if (dataKeys.some((key) => !Array.isArray(saved?.[key]))) {
  saveJSON(OA_KEY, state)
}

function persist() {
  saveJSON(OA_KEY, state)
}

function adjustDepartmentPeople(name, delta) {
  const department = state.departments.find((item) => item.name === name)
  if (department) department.people = Math.max(0, department.people + delta)
}

function getStats() {
  const departments = state.departments.length
  const employees = state.employees.length
  const onLeave = state.approvals.filter((item) => item.status === '待审批').length
  const punchToday = state.attendance.filter((item) => item.time.startsWith(currentDay())).length
  const lateCount = state.attendance.filter((item) => item.result === '迟到').length
  const noticeCount = state.notices.length
  return { departments, employees, onLeave, punchToday, lateCount, noticeCount }
}

export function useOaStore() {
  const stats = computed(getStats)

  const departmentOptions = computed(() => state.departments.map((item) => ({ label: item.name, value: item.name })))
  const approvalPending = computed(() => state.approvals.filter((item) => item.status === '待审批'))
  const approvalDone = computed(() => state.approvals.filter((item) => item.status !== '待审批'))
  const attendanceToday = computed(() => state.attendance.filter((item) => item.time.startsWith(currentDay())).slice().reverse())

  function upsertDepartment(payload) {
    const index = state.departments.findIndex((item) => item.id === payload.id)
    if (index >= 0) {
      const previous = state.departments[index]
      state.departments[index] = { ...previous, ...payload }
      if (previous.name !== payload.name) {
        state.employees.forEach((employee) => {
          if (employee.department === previous.name) employee.department = payload.name
        })
      }
    }
    else state.departments.unshift({ id: uid(), people: 0, ...payload })
    persist()
  }

  function removeDepartment(id) {
    state.departments = state.departments.filter((item) => item.id !== id)
    persist()
  }

  function upsertEmployee(payload) {
    const index = state.employees.findIndex((item) => item.id === payload.id)
    if (index >= 0) {
      const previous = state.employees[index]
      state.employees[index] = { ...previous, ...payload }
      if (previous.department !== payload.department) {
        adjustDepartmentPeople(previous.department, -1)
        adjustDepartmentPeople(payload.department, 1)
      }
    } else {
      state.employees.unshift({ id: uid(), status: '在岗', ...payload })
      adjustDepartmentPeople(payload.department, 1)
    }
    persist()
  }

  function removeEmployee(id) {
    const employee = state.employees.find((item) => item.id === id)
    if (employee) adjustDepartmentPeople(employee.department, -1)
    state.employees = state.employees.filter((item) => item.id !== id)
    persist()
  }

  function punch(profile, type) {
    const already = state.attendance.find((item) => item.employee === profile.name && item.time.startsWith(currentDay()) && item.type === type)
    if (already) throw new Error('今天已经打过同类卡了')
    const result = type === '上班打卡' ? '正常' : '正常'
    state.attendance.unshift({
      id: uid(),
      employee: profile.name,
      department: profile.department,
      type,
      time: formatDate(new Date()),
      result,
      note: '前端演示记录'
    })
    persist()
  }

  function createApproval(payload, profile) {
    state.approvals.unshift({
      id: uid(),
      applicant: profile.name,
      type: payload.type,
      days: payload.days,
      reason: payload.reason,
      status: '待审批',
      approver: '直属主管',
      createdAt: formatDate(new Date())
    })
    persist()
  }

  function reviewApproval(id, status, comment) {
    const target = state.approvals.find((item) => item.id === id)
    if (!target) return
    target.status = status
    target.reviewComment = comment
    target.reviewedAt = formatDate(new Date())
    persist()
  }

  function createNotice(payload, profile) {
    state.notices.unshift({
      id: uid(),
      title: payload.title,
      scope: payload.scope,
      status: '已发布',
      publisher: profile.name,
      createdAt: formatDate(new Date()),
      content: payload.content
    })
    persist()
  }

  return {
    state: readonly(state),
    stats,
    departmentOptions,
    approvalPending,
    approvalDone,
    attendanceToday,
    upsertDepartment,
    removeDepartment,
    upsertEmployee,
    removeEmployee,
    punch,
    createApproval,
    reviewApproval,
    createNotice
  }
}
