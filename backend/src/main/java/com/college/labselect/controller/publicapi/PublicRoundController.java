package com.college.labselect.controller.publicapi;

import com.college.labselect.common.Result;
import com.college.labselect.dto.resp.CurrentRoundVO;
import com.college.labselect.service.IRoundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 公共端轮次接口。
 */
@Tag(name = "公共-轮次")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public")
public class PublicRoundController {

    private final IRoundService roundService;

    /**
     * 当前轮次与时间窗状态。
     *
     * @return 当前轮次
     */
    @Operation(summary = "当前轮次")
    @GetMapping("/rounds/current")
    public Result<CurrentRoundVO> getCurrentRound() {
        return Result.success(roundService.getCurrentRound());
    }
}
