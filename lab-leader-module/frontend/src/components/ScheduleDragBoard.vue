<template>
  <div class="drag-board">
    <div class="board-header">
      <span class="section-title">待排学生</span>
      <span class="count">共 {{ students.length }} 人</span>
    </div>
    <div v-if="students.length === 0" class="empty-tip">本室已提交意向的学生均已排期</div>
    <div v-else class="student-pool">
      <div
        v-for="student in students"
        :key="`${student.studentId}:${student.mentorId}`"
        class="student-chip"
        :class="{ dragging: isDragging(student) }"
        draggable="true"
        @dragstart="startDrag($event, student)"
        @dragend="endDrag"
      >
        <span class="student-name">{{ student.studentName }}</span>
        <span class="student-no">{{ student.studentNo }}</span>
        <span class="student-mentors">导师：{{ student.mentorName || '—' }}</span>
      </div>
    </div>

    <div class="board-header drop-header">
      <span class="section-title">拖拽到草稿场次</span>
      <span class="count">共 {{ sessions.length }} 个场次</span>
    </div>
    <div v-if="sessions.length === 0" class="empty-tip">暂无草稿场次，请先新增场次</div>
    <div v-else class="drop-grid">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="drop-card"
        :class="{
          full: isFull(session),
          active: overSessionId === session.id,
          disabled: busy
        }"
        @dragover.prevent="onDragOver(session)"
        @dragleave="onDragLeave(session)"
        @drop.prevent="onDrop($event, session)"
      >
        <div class="drop-title">{{ session.sessionName }}</div>
        <div class="drop-meta">{{ session.interviewDate }} {{ session.startTime }}-{{ session.endTime }}</div>
        <div class="drop-meta">{{ session.location }}</div>
        <div class="drop-capacity">
          已排 {{ session.scheduledCount }} / {{ session.capacity }}
          <span v-if="isFull(session)" class="full-tip">已满</span>
        </div>
      </div>
    </div>
    <p class="board-tip">按住学生卡片拖到草稿场次即可排期；已发布场次需先「取消并重排」。</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { InterviewSession, UnassignedStudent } from '@/types/interview'

interface Props {
  students: UnassignedStudent[]
  sessions: InterviewSession[]
  busy?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'assign', studentId: number, mentorId: number, sessionId: number): void
}>()

const draggingStudent = ref<UnassignedStudent | null>(null)
const overSessionId = ref<number | null>(null)

function isDragging(student: UnassignedStudent): boolean {
  return (
    draggingStudent.value?.studentId === student.studentId &&
    draggingStudent.value?.mentorId === student.mentorId
  )
}

function isFull(session: InterviewSession): boolean {
  return session.scheduledCount >= session.capacity
}

function startDrag(event: DragEvent, student: UnassignedStudent) {
  draggingStudent.value = student
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${student.studentId}:${student.mentorId}`)
  }
}

function endDrag() {
  draggingStudent.value = null
  overSessionId.value = null
}

function onDragOver(session: InterviewSession) {
  if (!draggingStudent.value || isFull(session)) {
    return
  }
  overSessionId.value = session.id
}

function onDragLeave(session: InterviewSession) {
  if (overSessionId.value === session.id) {
    overSessionId.value = null
  }
}

function onDrop(event: DragEvent, session: InterviewSession) {
  const student = draggingStudent.value
  draggingStudent.value = null
  overSessionId.value = null
  if (!student || isFull(session)) {
    return
  }
  emit('assign', student.studentId, student.mentorId, session.id)
}
</script>

<style scoped>
.drag-board {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drop-header {
  margin-top: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.count {
  font-size: 13px;
  color: #909399;
}

.student-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.student-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  cursor: grab;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.student-chip:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.student-chip.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.student-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.student-no {
  font-size: 12px;
  color: #909399;
}

.student-mentors {
  font-size: 12px;
  color: #606266;
}

.drop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}

.drop-card {
  padding: 12px;
  border: 1px dashed #c0c4cc;
  border-radius: 6px;
  background: #fafafa;
  transition: border-color 0.2s, background 0.2s;
}

.drop-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.drop-card.full,
.drop-card.disabled {
  background: #f5f7fa;
  border-color: #e4e7ed;
}

.drop-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.drop-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.drop-capacity {
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
}

.full-tip {
  margin-left: 6px;
  color: #f56c6c;
}

.empty-tip {
  padding: 12px;
  font-size: 13px;
  color: #909399;
  background: #fafafa;
  border-radius: 6px;
}

.board-tip {
  margin: 0;
  font-size: 12px;
  color: #909399;
}
</style>
