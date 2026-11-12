package com.labmatch.selection.config;
import io.swagger.v3.oas.models.*; import io.swagger.v3.oas.models.info.Info; import io.swagger.v3.oas.models.security.*;
import org.springframework.context.annotation.Bean; import org.springframework.context.annotation.Configuration;
@Configuration public class OpenApiConfig { @Bean OpenAPI openAPI() { return new OpenAPI().info(new Info().title("实训室进组选拔系统 API").version("0.1.0")).components(new Components().addSecuritySchemes("bearerAuth", new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"))).addSecurityItem(new SecurityRequirement().addList("bearerAuth")); } }
