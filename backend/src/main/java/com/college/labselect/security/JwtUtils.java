package com.college.labselect.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * JWT 签发与解析工具。
 */
@Component
public class JwtUtils {

    private final SecretKey secretKey;
    private final long expireSeconds;

    /**
     * 构造 JWT 工具并校验密钥长度。
     *
     * @param secret        JWT 密钥
     * @param expireSeconds 有效期（秒）
     */
    public JwtUtils(@Value("${jwt.secret}") String secret,
                    @Value("${jwt.expire-seconds:7200}") long expireSeconds) {
        byte[] secretBytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException("JWT 密钥长度必须不少于 32 字节");
        }
        this.secretKey = Keys.hmacShaKeyFor(secretBytes);
        this.expireSeconds = expireSeconds;
    }

    /**
     * 签发 Token。
     *
     * @param loginUser 登录用户
     * @return JWT 字符串
     */
    public String generateToken(LoginUser loginUser) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + expireSeconds * 1000);
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(loginUser.getUserId()))
                .claim("userNo", loginUser.getUserNo())
                .claim("userType", loginUser.getUserType())
                .issuedAt(now)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }

    /**
     * 解析 Token 载荷。
     *
     * @param token JWT 字符串
     * @return 载荷
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 从 Token 还原登录用户。
     *
     * @param token JWT 字符串
     * @return 登录用户
     */
    public LoginUser getLoginUser(String token) {
        Claims claims = parseClaims(token);
        return new LoginUser(
                Long.valueOf(claims.getSubject()),
                claims.get("userNo", String.class),
                claims.get("userType", Integer.class));
    }

    /**
     * 获取 Token 唯一标识。
     *
     * @param token JWT 字符串
     * @return JTI
     */
    public String getJti(String token) {
        return parseClaims(token).getId();
    }

    /**
     * 获取 Token 过期时间。
     *
     * @param token JWT 字符串
     * @return 过期时间
     */
    public Date getExpiration(String token) {
        return parseClaims(token).getExpiration();
    }

    /**
     * 获取 Token 有效期（秒）。
     *
     * @return 有效期
     */
    public long getExpireSeconds() {
        return expireSeconds;
    }
}
