package com.labmatch.module.base.dto;

import lombok.Data;

@Data
public class LabView {

    private Long id;
    private String name;
    private String department;
    private String leaderName;
    private String directions;
    private Integer totalQuota;
    private Integer remaining;
    private Integer mentorCount;
    private String status;
}
