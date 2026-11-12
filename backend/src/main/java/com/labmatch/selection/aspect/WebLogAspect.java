package com.labmatch.selection.aspect;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
@Aspect @Component public class WebLogAspect { private static final Logger log = LoggerFactory.getLogger(WebLogAspect.class); @Around("@annotation(webLog)") public Object log(ProceedingJoinPoint p, WebLog webLog) throws Throwable { log.info("API action: {}", webLog.value()); return p.proceed(); } }
