package com.labmatch.module.application.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labmatch.module.application.entity.StudentApplication;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StudentApplicationMapper extends BaseMapper<StudentApplication> {
}
