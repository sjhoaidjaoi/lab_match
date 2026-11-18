import { defineStore } from 'pinia'
import { studentApi } from '@/api/student'
import type { NoticeItem } from '@/types'

export const useStudentNoticesStore = defineStore('student-notices', {
  state: () => ({ notices: [] as NoticeItem[], revision: 0 }),
  getters: {
    unreadCount: state => state.notices.filter(notice => !notice.read).length
  },
  actions: {
    async load() {
      const revision = ++this.revision
      const notices = await studentApi.myNotices()
      if (revision === this.revision) this.notices = notices
    },
    async markRead(id: number) {
      await studentApi.readNotice(id)
      this.revision += 1
      const notice = this.notices.find(item => item.id === id)
      if (notice) notice.read = true
    }
  }
})
