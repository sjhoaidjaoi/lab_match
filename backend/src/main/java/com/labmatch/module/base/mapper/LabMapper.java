package com.labmatch.module.base.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labmatch.module.base.entity.Lab;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LabMapper extends BaseMapper<Lab> {
}
