package com.labmatch.module.interview.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labmatch.module.interview.entity.Question;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface QuestionMapper extends BaseMapper<Question> {
}
