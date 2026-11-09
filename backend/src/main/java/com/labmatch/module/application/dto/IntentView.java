package com.labmatch.module.application.dto;

import lombok.Data;

@Data
public class IntentView {

    private Long mentorId;
    private String mentorName;
    private Long labId;
    private String labName;
    private String direction;
    private Integer available;
}
