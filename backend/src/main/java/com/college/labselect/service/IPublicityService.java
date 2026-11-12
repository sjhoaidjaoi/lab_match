package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.PublicityCreateReqDTO;
import com.college.labselect.dto.resp.PublicityConfirmRespVO;
import com.college.labselect.dto.resp.PublicityAdminDetailVO;
import com.college.labselect.dto.resp.PublicityCreateRespVO;
import com.college.labselect.dto.resp.PublicityDetailVO;
import com.college.labselect.dto.resp.PublicityListVO;

/**
 * 公示批次服务。
 */
public interface IPublicityService {

    /**
     * 管理员查询公示批次列表。
     *
     * @param roundId  轮次 ID，可为空
     * @param status   公示状态，可为空
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 公示批次分页
     */
    PageResult<PublicityListVO> listPublicities(Long roundId, Integer status, long pageNum, long pageSize);

    /**
     * 管理员查看公示名单明细，返回完整学号与姓名。
     *
     * @param id 公示批次 ID
     * @return 公示名单明细
     */
    PublicityAdminDetailVO getAdminPublicityRows(Long id);

    /**
     * 发起公示。
     *
     * @param adminUserId 管理员用户 ID
     * @param req         发起请求
     * @return 公示批次与名单人数
     */
    PublicityCreateRespVO createPublicity(Long adminUserId, PublicityCreateReqDTO req);

    /**
     * 结束公示。
     *
     * @param adminUserId 管理员用户 ID
     * @param id          公示批次 ID
     */
    void endPublicity(Long adminUserId, Long id);

    /**
     * 确认最终名单，本轮录取批量置为已入组。
     *
     * @param adminUserId 管理员用户 ID
     * @param id          公示批次 ID
     * @return 确认结果
     */
    PublicityConfirmRespVO confirmFinal(Long adminUserId, Long id);

    /**
     * 学生查看公示名单，本人完整、他人脱敏。
     *
     * @param studentUserId 学生用户 ID
     * @param id            公示批次 ID
     * @return 公示详情
     */
    PublicityDetailVO getStudentPublicity(Long studentUserId, Long id);
}
