import { http } from './request'
import type {
  PanoramaItem,
  PanoramaPayload,
  VideoItem,
  VideoPayload
} from '@/types'

/**
 * 阶段一宣讲视频 / 阶段二 720° 全景云游。
 * 学生端接口只返回已发布资源；admin 系列需要 COLLEGE_ADMIN 或 LAB_HEAD 角色。
 */
export const mediaApi = {
  videos: (labId?: number) => http.get<VideoItem[]>('/media/videos', labId ? { labId } : undefined),
  labVideos: (labId: number) => http.get<VideoItem[]>(`/media/labs/${labId}/videos`),
  panoramas: (labId?: number) => http.get<PanoramaItem[]>('/media/panoramas', labId ? { labId } : undefined),
  labPanoramas: (labId: number) => http.get<PanoramaItem[]>(`/media/labs/${labId}/panoramas`),

  adminVideos: (labId?: number) =>
    http.get<VideoItem[]>('/media/admin/videos', labId ? { labId } : undefined),
  createVideo: (payload: VideoPayload) => http.post<VideoItem>('/media/admin/videos', payload),
  updateVideo: (id: number, payload: VideoPayload) => http.put<VideoItem>(`/media/admin/videos/${id}`, payload),
  deleteVideo: (id: number) => http.delete<void>(`/media/admin/videos/${id}`),

  adminPanoramas: (labId?: number) =>
    http.get<PanoramaItem[]>('/media/admin/panoramas', labId ? { labId } : undefined),
  createPanorama: (payload: PanoramaPayload) => http.post<PanoramaItem>('/media/admin/panoramas', payload),
  updatePanorama: (id: number, payload: PanoramaPayload) =>
    http.put<PanoramaItem>(`/media/admin/panoramas/${id}`, payload),
  deletePanorama: (id: number) => http.delete<void>(`/media/admin/panoramas/${id}`)
}
