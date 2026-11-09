package com.labmatch.module.base.controller;

import com.labmatch.common.BusinessException;
import com.labmatch.common.Result;
import com.labmatch.common.ResultCode;
import com.labmatch.module.base.dto.LabDetailView;
import com.labmatch.module.base.dto.LabView;
import com.labmatch.module.base.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "实训室目录")
@RestController
@RequestMapping("/api/labs")
@RequiredArgsConstructor
public class LabController {

    private final CatalogService catalogService;

    @Operation(summary = "实训室列表（含名额剩余）")
    @GetMapping
    public Result<List<LabView>> list() {
        return Result.ok(catalogService.labs());
    }

    @Operation(summary = "实训室详情（含导师与名额）")
    @GetMapping("/{id}")
    public Result<LabDetailView> detail(@PathVariable Long id) {
        LabDetailView view = catalogService.labDetail(id);
        if (view == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "实训室不存在", HttpStatus.NOT_FOUND);
        }
        return Result.ok(view);
    }
}
