package com.college.labselect.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.college.labselect.entity.MentorProfile;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 导师档案 Mapper。
 */
public interface MentorProfileMapper extends BaseMapper<MentorProfile> {

    /**
     * 条件占用名额，保证 quota_used 不超过 quota。
     *
     * @param mentorId 导师档案 ID
     * @param delta    本次占用数量
     * @return 受影响行数，0 表示名额不足
     */
    @Update("UPDATE mentor_profile SET quota_used = quota_used + #{delta}, version = version + 1, "
            + "gmt_modified = NOW() WHERE id = #{mentorId} AND quota_used + #{delta} <= quota")
    int increaseQuotaUsed(@Param("mentorId") Long mentorId, @Param("delta") int delta);

    /**
     * 条件释放名额，保证 quota_used 不为负。
     *
     * @param mentorId 导师档案 ID
     * @param delta    本次释放数量
     * @return 受影响行数，0 表示已无可释放名额
     */
    @Update("UPDATE mentor_profile SET quota_used = quota_used - #{delta}, version = version + 1, "
            + "gmt_modified = NOW() WHERE id = #{mentorId} AND quota_used >= #{delta}")
    int decreaseQuotaUsed(@Param("mentorId") Long mentorId, @Param("delta") int delta);
}
