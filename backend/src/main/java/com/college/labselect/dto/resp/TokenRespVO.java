package com.college.labselect.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Token 响应。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenRespVO {

    private String token;
    private Long expiresIn;
}
