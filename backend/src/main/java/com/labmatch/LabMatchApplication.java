package com.labmatch;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.labmatch.module")
public class LabMatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(LabMatchApplication.class, args);
    }
}
