package com.labmatch.selection.mvp;

import com.labmatch.selection.dto.resp.Result;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@Profile("mvp")
@Order(0)
@RestControllerAdvice(assignableTypes = {MvpAuthController.class, MvpStudentController.class})
class MvpErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Result<Void>> businessError(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode())
            .body(Result.fail(error.getStatusCode().value(), error.getReason()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Result<Void>> invalidBody() {
        return ResponseEntity.badRequest().body(Result.fail(400, "请求数据格式无效"));
    }
}
