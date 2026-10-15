package com.hiikky.admin.service;

import com.hiikky.admin.dto.AdminResponse;
import com.hiikky.admin.dto.FirstSuperAdminSetupRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.repository.AdminAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AdminBootstrapService {

    private final AdminAccountRepository accountRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final String configuredSecret;

    public AdminBootstrapService(
            AdminAccountRepository accountRepository,
            JdbcTemplate jdbcTemplate,
            PasswordEncoder passwordEncoder,
            @Value("${admin.bootstrap.secret:}") String configuredSecret) {
        this.accountRepository = accountRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.configuredSecret = configuredSecret;
    }

    @Transactional(noRollbackFor = DuplicateResourceException.class)
    public AdminResponse initialize(FirstSuperAdminSetupRequest request, String suppliedSecret) {
        if (configuredSecret.length() < 32 || !MessageDigest.isEqual(
                configuredSecret.getBytes(StandardCharsets.UTF_8),
                suppliedSecret.getBytes(StandardCharsets.UTF_8))) {
            throw new AccessDeniedException("First Super Admin setup is unavailable");
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Password must not exceed 72 UTF-8 bytes");
        }

        Boolean initialized = jdbcTemplate.queryForObject(
                "SELECT initialized FROM admin_bootstrap_state WHERE id = 1 FOR UPDATE",
                Boolean.class);
        if (initialized == null) {
            throw new IllegalStateException("Admin bootstrap state is missing; apply the database migrations");
        }
        if (initialized || accountRepository.count() > 0) {
            jdbcTemplate.update("UPDATE admin_bootstrap_state SET initialized = TRUE WHERE id = 1");
            throw new DuplicateResourceException("First Super Admin setup has already been completed");
        }

        AdminAccount account = new AdminAccount();
        account.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        account.setPasswordHash(passwordEncoder.encode(request.password()));
        account.setRole(AdminRole.SUPER_ADMIN);
        account.setEnabled(true);
        LocalDateTime now = LocalDateTime.now();
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        AdminAccount created = accountRepository.save(account);
        jdbcTemplate.update("UPDATE admin_bootstrap_state SET initialized = TRUE WHERE id = 1");
        return new AdminResponse(created.getId(), created.getEmail(), created.getRole(), created.isEnabled());
    }
}
