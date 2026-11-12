package com.college.labselect.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Web MVC 配置，开放本地上传文件的免登录访问路径。
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /**
     * 上传文件根目录。
     */
    @Value("${lab-select.upload-dir:./uploads}")
    private String uploadDir;

    /**
     * 将 /api/v1/files/** 映射到本地上传目录。
     *
     * @param registry 资源处理器注册表
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = root.toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/api/v1/files/**").addResourceLocations(location);
    }
}
