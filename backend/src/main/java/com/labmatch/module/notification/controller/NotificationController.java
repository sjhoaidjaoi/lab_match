package com.labmatch.module.notification.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labmatch.common.PageResult;
import com.labmatch.common.Result;
import com.labmatch.module.notification.entity.Notification;
import com.labmatch.module.notification.mapper.NotificationMapper;
import com.labmatch.security.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Tag(name = "站内通知")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationMapper notificationMapper;

    @Operation(summary = "我的通知")
    @GetMapping("/mine")
    public Result<PageResult<Notification>> mine(@RequestParam(defaultValue = "1") long page,
                                                @RequestParam(defaultValue = "20") long size) {
        Long userId = UserContext.userId();
        Page<Notification> p = notificationMapper.selectPage(new Page<>(page, Math.min(size, 100)),
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .orderByDesc(Notification::getCreatedAt));
        return Result.ok(PageResult.of(p.getRecords(), p.getTotal(), page, size));
    }

    @Operation(summary = "标记单条已读")
    @PostMapping("/{id}/read")
    public Result<Void> read(@PathVariable Long id) {
        Notification notification = notificationMapper.selectById(id);
        if (notification != null && notification.getUserId().equals(UserContext.userId())) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationMapper.updateById(notification);
        }
        return Result.ok();
    }

    @Operation(summary = "全部标记已读")
    @PostMapping("/read-all")
    public Result<Void> readAll() {
        notificationMapper.update(null,
                new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<Notification>()
                        .eq(Notification::getUserId, UserContext.userId())
                        .eq(Notification::getIsRead, false)
                        .set(Notification::getIsRead, true)
                        .set(Notification::getReadAt, LocalDateTime.now()));
        return Result.ok();
    }
}
