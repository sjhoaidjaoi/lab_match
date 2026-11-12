package com.college.labselect;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 学生实训室进组选拔平台启动类。
 */
@EnableScheduling
@MapperScan("com.college.labselect.mapper")
@SpringBootApplication
public class LabSelectApplication {

    /**
     * 应用入口。
     *
     * @param args 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(LabSelectApplication.class, args);
    }
}
