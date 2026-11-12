package com.college.labselect.service;

import com.college.labselect.dto.req.RoundLockReqDTO;
import com.college.labselect.dto.req.RoundUnlockReqDTO;
import com.college.labselect.dto.req.SnapshotCreateReqDTO;
import com.college.labselect.dto.resp.ResultOverviewVO;
import com.college.labselect.dto.resp.RoundLockRespVO;
import com.college.labselect.dto.resp.RoundUnlockRespVO;
import com.college.labselect.dto.resp.SnapshotCreateRespVO;
import com.college.labselect.dto.resp.SnapshotListItemVO;

import java.util.List;

/**
 * 轮次快照与批次归档服务。
 */
public interface IArchiveService {

    /**
     * 生成轮次快照，同轮同类型追加新版本。
     *
     * @param operatorId 操作人用户 ID
     * @param roundId    轮次 ID
     * @param req        快照类型
     * @return 新快照 ID、版本号与记录数
     */
    SnapshotCreateRespVO generateSnapshot(Long operatorId, Long roundId, SnapshotCreateReqDTO req);

    /**
     * 查询轮次快照历史。
     *
     * @param roundId      轮次 ID
     * @param snapshotType 快照类型，可为空
     * @return 快照历史列表
     */
    List<SnapshotListItemVO> listSnapshots(Long roundId, Integer snapshotType);

    /**
     * 批次锁定，仅最后一轮在归档快照生成且公示确认后可锁定。
     *
     * @param operatorId 操作人用户 ID
     * @param roundId    轮次 ID
     * @param req        锁定原因
     * @return 锁定状态与时间
     */
    RoundLockRespVO lockRound(Long operatorId, Long roundId, RoundLockReqDTO req);

    /**
     * 批次解锁，需管理员密码二次验证。
     *
     * @param operatorId 操作人用户 ID
     * @param roundId    轮次 ID
     * @param req        解锁原因与管理员密码
     * @return 解锁状态与时间
     */
    RoundUnlockRespVO unlockRound(Long operatorId, Long roundId, RoundUnlockReqDTO req);

    /**
     * 全院录取总览，归档后从最终归档快照渲染。
     *
     * @param roundId  轮次 ID
     * @param labId    实训室 ID
     * @param mentorId 导师档案 ID
     * @param keyword  学号或姓名关键词
     * @param status   录取状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 总览统计与分页列表
     */
    ResultOverviewVO resultOverview(Long roundId, Long labId, Long mentorId, String keyword,
                                    Integer status, long pageNum, long pageSize);

    /**
     * 导出录取 Excel，归档后从最终归档快照渲染。
     *
     * @param roundId  轮次 ID
     * @param labId    实训室 ID
     * @param mentorId 导师档案 ID
     * @return Excel 字节流
     */
    byte[] exportResults(Long roundId, Long labId, Long mentorId);
}
