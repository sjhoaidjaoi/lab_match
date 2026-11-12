package com.college.labselect.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 保存学生档案响应。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentArchiveSaveRespVO {

    private List<String> missingFields;
}
