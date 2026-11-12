package com.college.labselect.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.college.labselect.entity.Notice;
import org.apache.ibatis.annotations.Mapper;

/**
 * 公告数据访问。
 */
@Mapper
public interface NoticeMapper extends BaseMapper<Notice> {
}
