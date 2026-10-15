package com.hiikky.admin.controller;

import com.hiikky.admin.repository.AdminAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin_bootstrap_test_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL",
        "admin.bootstrap.secret=test-bootstrap-secret-for-automated-tests-only"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminBootstrapControllerTest {

    private static final String SETUP_SECRET = "test-bootstrap-secret-for-automated-tests-only";
    private static final String PASSWORD = "InitialSuperAdminPassword2026";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AdminAccountRepository accountRepository;

    @BeforeEach
    void resetBootstrapState() {
        jdbcTemplate.update("DELETE FROM business_request_history");
        jdbcTemplate.update("DELETE FROM business_requests");
        jdbcTemplate.update("DELETE FROM admin_accounts");
        jdbcTemplate.update("UPDATE admin_bootstrap_state SET initialized = FALSE WHERE id = 1");
    }

    @Test
    void createsTheFirstSuperAdminAndStoresOnlyThePasswordHash() throws Exception {
        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .with(csrf())
                        .header("X-Admin-Bootstrap-Secret", SETUP_SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("root-admin@example.test", PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value("root-admin@example.test"))
                .andExpect(jsonPath("$.data.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());

        var account = accountRepository.findByEmail("root-admin@example.test").orElseThrow();
        assertTrue(passwordEncoder.matches(PASSWORD, account.getPasswordHash()));
        assertFalse(account.getPasswordHash().equals(PASSWORD));
        assertTrue(jdbcTemplate.queryForObject(
                "SELECT initialized FROM admin_bootstrap_state WHERE id = 1", Boolean.class));
    }

    @Test
    void rejectsAnInvalidSetupSecretWithoutCreatingAnAccount() throws Exception {
        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .with(csrf())
                        .header("X-Admin-Bootstrap-Secret", "invalid-bootstrap-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("root-admin@example.test", PASSWORD)))
                .andExpect(status().isForbidden());
        assertEquals(0, accountRepository.count());
    }

    @Test
    void rejectsRepeatedInitialization() throws Exception {
        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .with(csrf())
                        .header("X-Admin-Bootstrap-Secret", SETUP_SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("root-admin@example.test", PASSWORD)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .with(csrf())
                        .header("X-Admin-Bootstrap-Secret", SETUP_SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("another-admin@example.test", PASSWORD)))
                .andExpect(status().isConflict());
        assertEquals(1, accountRepository.count());
    }

    @Test
    void recordsBootstrapAsCompleteWhenAnAdminAlreadyExists() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO admin_accounts (email, password_hash, role, enabled) VALUES (?, ?, ?, TRUE)",
                "existing-admin@example.test", passwordEncoder.encode(PASSWORD), "SUPER_ADMIN");

        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .with(csrf())
                        .header("X-Admin-Bootstrap-Secret", SETUP_SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("another-admin@example.test", PASSWORD)))
                .andExpect(status().isConflict());

        assertEquals(1, accountRepository.count());
        assertTrue(jdbcTemplate.queryForObject(
                "SELECT initialized FROM admin_bootstrap_state WHERE id = 1", Boolean.class));
    }

    @Test
    void requiresTheSetupSecretAndCsrfProtection() throws Exception {
        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .with(csrf())
                        .header("X-Admin-Bootstrap-Secret", "invalid-bootstrap-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("root-admin@example.test", PASSWORD)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/setup/first-super-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody("root-admin@example.test", PASSWORD)))
                .andExpect(status().isForbidden());
        assertEquals(0, accountRepository.count());
    }

    private String requestBody(String email, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
    }
}
