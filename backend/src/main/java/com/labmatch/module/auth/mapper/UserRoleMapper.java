package com.labmatch.module.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.labmatch.module.auth.entity.UserRole;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserRoleMapper extends BaseMapper<UserRole> {

    @Select("SELECT * FROM user_role WHERE user_id = #{userId} AND active = 1 ORDER BY id")
    List<UserRole> selectActiveByUserId(@Param("userId") Long userId);
}
