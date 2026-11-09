package com.labmatch.common;

import lombok.Data;

import java.util.List;

/**
 * 统一分页返回结构。
 */
@Data
public class PageResult<T> {

    private List<T> records;
    private long total;
    private long page;
    private long size;

    public static <T> PageResult<T> of(List<T> records, long total, long page, long size) {
        PageResult<T> r = new PageResult<>();
        r.setRecords(records);
        r.setTotal(total);
        r.setPage(page);
        r.setSize(size);
        return r;
    }
}
