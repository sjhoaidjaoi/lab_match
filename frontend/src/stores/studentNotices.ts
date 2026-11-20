import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { studentApi } from '@/api/student'
import type { NoticeItem } from '@/types'

export const useStudentNoticesStore = defineStore('student-notices', () => {
  const notices = ref<NoticeItem[]>([])
  const unreadCount = computed(() => notices.value.filter(notice => !notice.read).length)
  let session = 0
  let revision = 0
  let pending: Promise<void> | undefined

  function load() {
    if (pending) return pending
    const currentRevision = revision
    const request = studentApi.myNotices({ silent: true }).then(items => {
      if (currentRevision === revision) notices.value = items
    }).finally(() => {
      if (pending === request) pending = undefined
    })
    pending = request
    return request
  }

  async function markRead(id: number) {
    const currentSession = session
    await studentApi.readNotice(id)
    if (currentSession !== session) return
    revision += 1
    pending = undefined
    const notice = notices.value.find(item => item.id === id)
    if (notice) notice.read = true
  }

  function reset() {
    session += 1
    revision += 1
    pending = undefined
    notices.value = []
  }

  return { notices, unreadCount, load, markRead, reset }
})
