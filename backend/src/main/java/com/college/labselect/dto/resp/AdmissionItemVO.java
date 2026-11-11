package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 我的录取名单项，字段对齐 01_PRD.md §5.3 我的录取名单页。
 */
@Data
public class AdmissionItemVO {

    private Long id;
    private Long studentId;
    private String studentNo;
    private String studentName;
    private Integer status;
    private String statusText;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmTime;
}
