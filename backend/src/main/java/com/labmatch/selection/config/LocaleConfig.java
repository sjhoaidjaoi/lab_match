package com.labmatch.selection.config;
import org.springframework.context.annotation.*; import org.springframework.web.servlet.LocaleResolver; import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver; import java.util.Locale;
@Configuration public class LocaleConfig { @Bean LocaleResolver localeResolver() { AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver(); resolver.setDefaultLocale(Locale.SIMPLIFIED_CHINESE); return resolver; } }
