package com.hiikky.admin;

import com.hiikky.admin.dto.LoginRequest;
import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.repository.AdminAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HiikkyAdminBackendApplicationTests {

	@Autowired
	private DataSource dataSource;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AdminAccountRepository adminAccountRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		if (adminAccountRepository.findByEmail("admin@hiikky.com").isEmpty()) {
			AdminAccount admin = new AdminAccount();
			admin.setEmail("admin@hiikky.com");
			admin.setPasswordHash(passwordEncoder.encode("SecureAdminPassword123"));
			admin.setRole(AdminRole.ADMIN);
			admin.setEnabled(true);
			adminAccountRepository.save(admin);
		}

		if (adminAccountRepository.findByEmail("superadmin@hiikky.com").isEmpty()) {
			AdminAccount superAdmin = new AdminAccount();
			superAdmin.setEmail("superadmin@hiikky.com");
			superAdmin.setPasswordHash(passwordEncoder.encode("SuperAdminPassword123"));
			superAdmin.setRole(AdminRole.SUPER_ADMIN);
			superAdmin.setEnabled(true);
			adminAccountRepository.save(superAdmin);
		}

		if (adminAccountRepository.findByEmail("disabled@hiikky.com").isEmpty()) {
			AdminAccount disabledAdmin = new AdminAccount();
			disabledAdmin.setEmail("disabled@hiikky.com");
			disabledAdmin.setPasswordHash(passwordEncoder.encode("DisabledPassword123"));
			disabledAdmin.setRole(AdminRole.ADMIN);
			disabledAdmin.setEnabled(false);
			adminAccountRepository.save(disabledAdmin);
		}
	}

	@Test
	void contextLoads() throws SQLException {
		assertNotNull(dataSource, "DataSource bean should be loaded in application context");
		try (Connection connection = dataSource.getConnection()) {
			String databaseProductName = connection.getMetaData().getDatabaseProductName();
			System.out.println("Active Test Database Product: " + databaseProductName);
			assertTrue(databaseProductName.equalsIgnoreCase("H2"), "Test should use H2 in-memory database");
		}
	}

	@Test
	void passwordEncoderVerifiesHashedPassword() {
		String rawPassword = "TestPassword123";
		String encoded = passwordEncoder.encode(rawPassword);
		assertTrue(passwordEncoder.matches(rawPassword, encoded));
	}

	@Test
	void loginWithInvalidCredentialsFailsWithGenericMessage() throws Exception {
		LoginRequest request = new LoginRequest("admin@hiikky.com", "WrongPassword999");
		mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message").value("Invalid credentials"));
	}

	@Test
	void loginWithNonExistentEmailFailsWithGenericMessage() throws Exception {
		LoginRequest request = new LoginRequest("unknown@hiikky.com", "SomePassword123");
		mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message").value("Invalid credentials"));
	}

	@Test
	void loginWithDisabledAccountFailsWithGenericMessage() throws Exception {
		LoginRequest request = new LoginRequest("disabled@hiikky.com", "DisabledPassword123");
		mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message").value("Invalid credentials"));
	}

	@Test
	void unauthorizedAccessToProtectedEndpointIsRejected() throws Exception {
		mockMvc.perform(get("/api/admin/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message").value("Full authentication is required to access this resource"));
	}

	@Test
	void unapprovedOrUnknownEndpointsAreDeniedByDefault() throws Exception {
		mockMvc.perform(get("/api/unknown/endpoint"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void loginValidationFailsForInvalidEmailAndEmptyPassword() throws Exception {
		LoginRequest invalidEmailReq = new LoginRequest("not-an-email", "ValidPass123");
		mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(invalidEmailReq)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false));

		LoginRequest blankPassReq = new LoginRequest("admin@hiikky.com", "");
		mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(blankPassReq)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false));
	}

	@Test
	void loginWithValidCredentialsSucceedsAndEstablishesSession() throws Exception {
		LoginRequest request = new LoginRequest("admin@hiikky.com", "SecureAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.email").value("admin@hiikky.com"))
				.andExpect(jsonPath("$.data.role").value("ADMIN"))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist())
				.andReturn();

		var session = loginResult.getRequest().getSession();
		assertNotNull(session);

		mockMvc.perform(get("/api/admin/me")
						.session((org.springframework.mock.web.MockHttpSession) session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").value("admin@hiikky.com"));
	}

	@Test
	void sessionFixationProtectionChangesSessionIdUponAuthentication() throws Exception {
		org.springframework.mock.web.MockHttpSession initialSession = new org.springframework.mock.web.MockHttpSession();
		String originalSessionId = initialSession.getId();

		LoginRequest request = new LoginRequest("admin@hiikky.com", "SecureAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.session(initialSession)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();

		var authenticatedSession = loginResult.getRequest().getSession();
		assertNotNull(authenticatedSession);
		assertNotEquals(originalSessionId, authenticatedSession.getId(), "Session ID should change after login to prevent fixation");
	}

	@Test
	void sessionInvalidationAfterLogoutPreventsSubsequentAccess() throws Exception {
		LoginRequest request = new LoginRequest("admin@hiikky.com", "SecureAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();

		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();
		assertNotNull(session);

		mockMvc.perform(post("/api/admin/auth/logout")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));

		assertTrue(session.isInvalid(), "HTTP session should be invalidated after logout");

		mockMvc.perform(get("/api/admin/me")
						.session(session))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void regularAdminCannotAccessSuperAdminEndpoint() throws Exception {
		LoginRequest request = new LoginRequest("admin@hiikky.com", "SecureAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();

		var session = loginResult.getRequest().getSession();

		mockMvc.perform(get("/api/admin/super-admin/dashboard")
						.session((org.springframework.mock.web.MockHttpSession) session))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message").value("Access denied"));
	}

	@Test
	void superAdminCanAccessSuperAdminEndpoint() throws Exception {
		LoginRequest request = new LoginRequest("superadmin@hiikky.com", "SuperAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();

		var session = loginResult.getRequest().getSession();

		mockMvc.perform(get("/api/admin/super-admin/dashboard")
						.session((org.springframework.mock.web.MockHttpSession) session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").value("Super admin dashboard content"));
	}

	@Test
	void securityHeadersArePresentOnResponses() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().string("X-Frame-Options", "DENY"));
	}
}
