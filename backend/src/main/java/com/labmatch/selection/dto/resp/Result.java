package com.labmatch.selection.dto.resp;
import java.time.Instant;
public record Result<T>(int code, String message, T data, long timestamp) {
  public static <T> Result<T> ok(T data) { return new Result<>(200, "success", data, Instant.now().toEpochMilli()); }
  public static <T> Result<T> fail(int code, String message) { return new Result<>(code, message, null, Instant.now().toEpochMilli()); }
}
