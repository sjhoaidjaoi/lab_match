<template>
  <div class="page">
    <PageHeader title="确认汇总" desc="组长查看全室确认情况，用于判断内部调剂缺口。" />
    <div class="stat-grid" style="margin-bottom: 16px">
      <StatCard label="应确认" :value="room.intendedCount" suffix="人" />
      <StatCard label="已确认" :value="room.confirmedCount" suffix="人" />
      <StatCard label="待确认" :value="room.pendingCount" suffix="人" />
      <StatCard label="空缺名额" :value="room.vacancies" suffix="人" tone="#e6a23c" />
    </div>

    <div class="card">
      <QuotaBar :quota="room.quota" :admitted="room.confirmedCount" />
    </div>

    <div class="card">
      <el-table :data="room.intended" size="small">
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column label="确认状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.confirmed" :label="row.confirmed === 'PENDING' ? '待确认' : ''" /></template>
        </el-table-column>
        <el-table-column label="是否满足内部调剂前提" min-width="220">
          <template #default="{ row }">
            <span class="muted">{{ row.confirmed === 'CONFIRMED' ? '已占用名额，不进入调剂池' : '未确认，不重复进入调剂池（待学生结果）' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import QuotaBar from '@/components/QuotaBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useRoomStore } from '@/stores/room'

const room = useRoomStore()
</script>
