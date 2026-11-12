package com.college.labselect.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 统一分页响应体。
 *
 * @param <T> 列表元素类型
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {

    private Long total;
    private Long pageNum;
    private Long pageSize;
    private List<T> list;

    /**
     * 由 MyBatis-Plus 分页对象转换。
     *
     * @param page 分页对象
     * @param <T>  列表元素类型
     * @return 统一分页响应
     */
    public static <T> PageResult<T> of(IPage<T> page) {
        return new PageResult<>(page.getTotal(), page.getCurrent(), page.getSize(), page.getRecords());
    }
}
