package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.RoundCreateReqDTO;
import com.college.labselect.dto.req.RoundLockReqDTO;
import com.college.labselect.dto.req.RoundStatusReqDTO;
import com.college.labselect.dto.req.RoundUnlockReqDTO;
import com.college.labselect.dto.req.RoundUpdateReqDTO;
import com.college.labselect.dto.req.SnapshotCreateReqDTO;
import com.college.labselect.dto.resp.RoundListVO;
import com.college.labselect.dto.resp.RoundLockRespVO;
import com.college.labselect.dto.resp.RoundUnlockRespVO;
import com.college.labselect.dto.resp.SnapshotCreateRespVO;
import com.college.labselect.dto.resp.SnapshotListItemVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IArchiveService;
import com.college.labselect.service.IRoundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 管理端轮次接口。
 */
@Tag(name = "管理-轮次")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/rounds")
public class AdminRoundController {

    private final IRoundService roundService;

    private final IArchiveService archiveService;

    /**
     * 轮次列表。
     *
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    @Operation(summary = "轮次列表")
    @GetMapping
    public Result<PageResult<RoundListVO>> listRounds(
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(roundService.pageRounds(pageNum, pageSize));
    }

    /**
     * 新建轮次。
     *
     * @param req 新建请求
     * @return 轮次 ID
     */
    @Operation(summary = "新建轮次")
    @PostMapping
    public Result<Long> createRound(@Valid @RequestBody RoundCreateReqDTO req) {
        return Result.success(roundService.createRound(req));
    }

    /**
     * 修改轮次配置。
     *
     * @param id  轮次 ID
     * @param req 修改请求
     * @return 统一响应
     */
    @Operation(summary = "修改轮次配置")
    @PutMapping("/{id}")
    public Result<Void> updateRound(@PathVariable Long id, @Valid @RequestBody RoundUpdateReqDTO req) {
        roundService.updateRound(id, req);
        return Result.success();
    }

    /**
     * 开启 / 结束轮次。
     *
     * @param id  轮次 ID
     * @param req 状态请求
     * @return 统一响应
     */
    @Operation(summary = "开启/结束轮次")
    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody RoundStatusReqDTO req) {
        roundService.updateStatus(id, req);
        return Result.success();
    }

    /**
     * 手动重跑批次签发。
     *
     * @param id 轮次 ID
     * @return 统一响应
     */
    @Operation(summary = "手动重跑批次签发")
    @PostMapping("/{id}/issue")
    public Result<Void> issueRound(@PathVariable Long id) {
        roundService.issueRound(id);
        return Result.success();
    }

    /**
     * 生成轮次快照。
     *
     * @param loginUser 当前登录用户
     * @param id        轮次 ID
     * @param req       快照类型
     * @return 快照 ID、版本号与记录数
     */
    @Operation(summary = "生成轮次快照")
    @PostMapping("/{id}/snapshot")
    public Result<SnapshotCreateRespVO> snapshot(@AuthenticationPrincipal LoginUser loginUser,
                                                 @PathVariable Long id,
                                                 @Valid @RequestBody SnapshotCreateReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(archiveService.generateSnapshot(loginUser.getUserId(), id, req));
    }

    /**
     * 快照历史列表。
     *
     * @param id           轮次 ID
     * @param snapshotType 快照类型，可为空
     * @return 快照历史列表
     */
    @Operation(summary = "快照历史列表")
    @GetMapping("/{id}/snapshots")
    public Result<List<SnapshotListItemVO>> snapshots(@PathVariable Long id,
                                                      @RequestParam(required = false) Integer snapshotType) {
        return Result.success(archiveService.listSnapshots(id, snapshotType));
    }

    /**
     * 批次锁定。
     *
     * @param loginUser 当前登录用户
     * @param id        轮次 ID
     * @param req       锁定请求
     * @return 锁定状态与时间
     */
    @Operation(summary = "批次锁定")
    @PostMapping("/{id}/lock")
    public Result<RoundLockRespVO> lock(@AuthenticationPrincipal LoginUser loginUser,
                                        @PathVariable Long id,
                                        @Valid @RequestBody RoundLockReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(archiveService.lockRound(loginUser.getUserId(), id, req));
    }

    /**
     * 批次解锁。
     *
     * @param loginUser 当前登录用户
     * @param id        轮次 ID
     * @param req       解锁请求
     * @return 解锁状态与时间
     */
    @Operation(summary = "批次解锁")
    @PostMapping("/{id}/unlock")
    public Result<RoundUnlockRespVO> unlock(@AuthenticationPrincipal LoginUser loginUser,
                                            @PathVariable Long id,
                                            @Valid @RequestBody RoundUnlockReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(archiveService.unlockRound(loginUser.getUserId(), id, req));
    }
}
