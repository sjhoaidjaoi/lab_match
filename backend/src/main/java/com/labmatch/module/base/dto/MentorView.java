package com.labmatch.module.base.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MentorView {

    private Long id;
    private Long userId;
    private String name;
    private String title;
    private String direction;
    private Long labId;
    private String labName;
    private Integer quota;
    private Integer used;
    private Integer reserved;

    public int getAvailable() {
        int q = quota == null ? 0 : quota;
        int u = used == null ? 0 : used;
        int r = reserved == null ? 0 : reserved;
        return Math.max(0, q - u - r);
    }
}
