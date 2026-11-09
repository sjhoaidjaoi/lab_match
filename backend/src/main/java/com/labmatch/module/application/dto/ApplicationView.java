package com.labmatch.module.application.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ApplicationView {

    private Long id;
    private Long cycleId;
    private Integer round;
    private String status;
    private LocalDateTime submittedAt;
    private String receiptNo;
    private Boolean acceptL1;
    private Boolean acceptL2;
    private Boolean editable;
    private LocalDateTime applyEnd;
    private List<IntentView> intents;
}
