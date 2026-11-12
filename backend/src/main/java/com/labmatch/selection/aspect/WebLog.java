package com.labmatch.selection.aspect;
import java.lang.annotation.*;
@Target(ElementType.METHOD) @Retention(RetentionPolicy.RUNTIME) public @interface WebLog { String value() default ""; }
