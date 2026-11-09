package com.labmatch.module.auth.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labmatch.common.BusinessException;
import com.labmatch.common.PageResult;
import com.labmatch.common.Result;
import com.labmatch.common.ResultCode;
import com.labmatch.module.auth.entity.UserAccount;
import com.labmatch.module.auth.mapper.UserAccountMapper;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 账号管理（学院管理员）。批量导入 Excel 待实现。
 * TODO(账号模块负责人)：Excel 导入与失败明细、单条新增、负责人提拔。
 */
@Tag(name = "账号管理")
@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
@RequireRole("COLLEGE_ADMIN")
public class AccountAdminController {

    private static final String INITIAL_PASSWORD = "123456";

    private final UserAccountMapper userAccountMapper;
    private final PasswordEncoder passwordEncoder;

    @Operation(summary = "账号列表")
    @GetMapping
    public Result<PageResult<UserAccount>> list(@RequestParam(required = false) String keyword,
                                                @RequestParam(defaultValue = "1") long page,
                                                @RequestParam(defaultValue = "20") long size) {
        LambdaQueryWrapper<UserAccount> wrapper = new LambdaQueryWrapper<UserAccount>()
                .orderByDesc(UserAccount::getId);
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(UserAccount::getLoginName, keyword).or().like(UserAccount::getName, keyword));
        }
        Page<UserAccount> p = userAccountMapper.selectPage(new Page<>(page, Math.min(size, 100)), wrapper);
        p.getRecords().forEach(u -> u.setPasswordHash(null));
        return Result.ok(PageResult.of(p.getRecords(), p.getTotal(), page, size));
    }

    @Operation(summary = "重置密码")
    @PostMapping("/{id}/reset-password")
    public Result<Void> resetPassword(@PathVariable Long id) {
        UserAccount account = requireAccount(id);
        account.setPasswordHash(passwordEncoder.encode(INITIAL_PASSWORD));
        account.setMustChangePassword(true);
        userAccountMapper.updateById(account);
        return Result.ok();
    }

    @Operation(summary = "启用/禁用账号")
    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam String status) {
        if (!"ENABLED".equals(status) && !"DISABLED".equals(status)) {
            throw new BusinessException(ResultCode.VALIDATION_FAILED, "账号状态不合法");
        }
        UserAccount account = requireAccount(id);
        account.setStatus(status);
        userAccountMapper.updateById(account);
        return Result.ok();
    }

    private UserAccount requireAccount(Long id) {
        UserAccount account = userAccountMapper.selectById(id);
        if (account == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "账号不存在", HttpStatus.NOT_FOUND);
        }
        return account;
    }
}
