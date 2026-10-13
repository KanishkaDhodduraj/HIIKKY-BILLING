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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
	void unauthorizedAccessToProtectedEndpointIsRejected() throws Exception {
		mockMvc.perform(get("/api/admin/me"))
				.andExpect(status().isUnauthorized());
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
				.andReturn();

		var session = loginResult.getRequest().getSession();
		assertNotNull(session);

		mockMvc.perform(get("/api/admin/me")
						.session((org.springframework.mock.web.MockHttpSession) session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").value("admin@hiikky.com"));
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
				.andExpect(status().isForbidden());
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
}
