package com.college.labselect.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.college.labselect.entity.UserNotice;
import org.apache.ibatis.annotations.Mapper;

/**
 * 站内通知数据访问。
 */
@Mapper
public interface UserNoticeMapper extends BaseMapper<UserNotice> {
}
