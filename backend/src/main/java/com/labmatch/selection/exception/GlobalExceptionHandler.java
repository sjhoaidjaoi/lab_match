package com.labmatch.selection.exception;
import com.labmatch.selection.dto.resp.Result;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
@RestControllerAdvice public class GlobalExceptionHandler {
  @ExceptionHandler(Exception.class) public ResponseEntity<Result<Void>> handle(Exception e) { return ResponseEntity.internalServerError().body(Result.fail(500, "系统异常，请稍后重试")); }
}
