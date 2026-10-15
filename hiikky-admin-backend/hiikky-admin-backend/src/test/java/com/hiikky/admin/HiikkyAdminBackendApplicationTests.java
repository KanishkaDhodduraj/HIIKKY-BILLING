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
import java.time.LocalDate;

import com.hiikky.admin.dto.AccountStatusRequest;
import com.hiikky.admin.dto.CreateAdminAccountRequest;
import com.hiikky.admin.dto.CreateBusinessOwnerRequest;
import com.hiikky.admin.dto.CreateOrganizationRequest;
import com.hiikky.admin.dto.UpdateAdminAccountRequest;
import com.hiikky.admin.dto.UpdateBusinessOwnerRequest;
import com.hiikky.admin.dto.UpdateOrganizationRequest;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

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

	@Test
	void superAdminCanListFilterSearchAndPaginateAccounts() throws Exception {
		LoginRequest request = new LoginRequest("superadmin@hiikky.com", "SuperAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		// List accounts with role and search filter
		mockMvc.perform(get("/api/admin/accounts")
						.session(session)
						.param("role", "ADMIN")
						.param("search", "admin@hiikky")
						.param("page", "0")
						.param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
				.andExpect(header().exists("X-Total-Count"));
	}

	@Test
	void accountManagementCrudLifecycleAndSuperAdminProtection() throws Exception {
		// Log in as Super Admin
		LoginRequest request = new LoginRequest("superadmin@hiikky.com", "SuperAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		// 1. Create a new Admin Account
		String uniqueEmail = "tempadmin_" + System.currentTimeMillis() + "@hiikky.com";
		CreateAdminAccountRequest createReq = new CreateAdminAccountRequest(uniqueEmail, "AdminPass123!", AdminRole.ADMIN);
		var createResult = mockMvc.perform(post("/api/admin/accounts")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.email").value(uniqueEmail))
				.andExpect(jsonPath("$.data.role").value("ADMIN"))
				.andExpect(jsonPath("$.data.enabled").value(true))
				.andReturn();

		String createJson = createResult.getResponse().getContentAsString();
		var createNode = objectMapper.readTree(createJson);
		long createdId = createNode.get("data").get("id").asLong();

		// 2. Prevent Duplicate Account Creation
		mockMvc.perform(post("/api/admin/accounts")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message", containsString("already exists")));

		// 3. View Account Details
		mockMvc.perform(get("/api/admin/accounts/" + createdId)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(createdId))
				.andExpect(jsonPath("$.data.email").value(uniqueEmail));

		// 4. Update Account Details
		String updatedEmail = "updated_" + System.currentTimeMillis() + "@hiikky.com";
		UpdateAdminAccountRequest updateReq = new UpdateAdminAccountRequest(updatedEmail, AdminRole.ADMIN, true, null);
		mockMvc.perform(put("/api/admin/accounts/" + createdId)
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(updateReq)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.email").value(updatedEmail));

		// 5. Deactivate Account
		mockMvc.perform(patch("/api/admin/accounts/" + createdId + "/deactivate")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.enabled").value(false));

		// 6. Activate Account
		mockMvc.perform(patch("/api/admin/accounts/" + createdId + "/activate")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.enabled").value(true));

		// 7. Last Active SUPER_ADMIN Protection
		AdminAccount superAdminAccount = adminAccountRepository.findByEmail("superadmin@hiikky.com").orElseThrow();
		Long superAdminId = superAdminAccount.getId();

		// Attempt deactivating the sole active SUPER_ADMIN -> Must be rejected
		mockMvc.perform(patch("/api/admin/accounts/" + superAdminId + "/deactivate")
						.session(session))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message", containsString("Cannot deactivate the last active SUPER_ADMIN")));

		// Attempt demoting the sole active SUPER_ADMIN -> Must be rejected
		UpdateAdminAccountRequest demoteReq = new UpdateAdminAccountRequest(null, AdminRole.ADMIN, null, null);
		mockMvc.perform(put("/api/admin/accounts/" + superAdminId)
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(demoteReq)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message", containsString("Cannot change role of the last active SUPER_ADMIN")));

		// Attempt deleting the sole active SUPER_ADMIN -> Must be rejected
		mockMvc.perform(delete("/api/admin/accounts/" + superAdminId)
						.session(session))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message", containsString("Cannot delete the last active SUPER_ADMIN")));

		// 8. Delete the temporary created account -> Should succeed
		mockMvc.perform(delete("/api/admin/accounts/" + createdId)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));

		// Verify deletion
		mockMvc.perform(get("/api/admin/accounts/" + createdId)
						.session(session))
				.andExpect(status().isNotFound());
	}

	@Test
	void regularAdminCannotAccessAccountManagementEndpoints() throws Exception {
		LoginRequest request = new LoginRequest("admin@hiikky.com", "SecureAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		// Listing accounts is forbidden for ADMIN
		mockMvc.perform(get("/api/admin/accounts")
						.session(session))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.message").value("Access denied"));

		// Creating accounts is forbidden for ADMIN
		CreateAdminAccountRequest createReq = new CreateAdminAccountRequest("test@hiikky.com", "AdminPass123!", AdminRole.ADMIN);
		mockMvc.perform(post("/api/admin/accounts")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isForbidden());
	}

	@Test
	void businessOwnerLifecycleIntegrationTest() throws Exception {
		LoginRequest loginReq = new LoginRequest("superadmin@hiikky.com", "SuperAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(loginReq)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		// 1. Create Business Owner
		String ownerEmail = "owner_" + System.currentTimeMillis() + "@test.com";
		CreateBusinessOwnerRequest createReq = new CreateBusinessOwnerRequest("John", "Doe", ownerEmail, "1234567890");
		var createResult = mockMvc.perform(post("/api/admin/business-owners")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.email").value(ownerEmail))
				.andExpect(jsonPath("$.data.status").value("ACTIVE"))
				.andReturn();

		long ownerId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("data").get("id").asLong();

		// 2. Duplicate Email Check
		mockMvc.perform(post("/api/admin/business-owners")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.success").value(false));

		// 3. View Owner Details
		mockMvc.perform(get("/api/admin/business-owners/" + ownerId)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id").value(ownerId))
				.andExpect(jsonPath("$.data.firstName").value("John"));

		// 4. Update Owner Details
		UpdateBusinessOwnerRequest updateReq = new UpdateBusinessOwnerRequest("Johnny", "Doe", null, "9999999999", null);
		mockMvc.perform(put("/api/admin/business-owners/" + ownerId)
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(updateReq)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.firstName").value("Johnny"))
				.andExpect(jsonPath("$.data.phone").value("9999999999"));

		// 5. Deactivate & Activate Owner
		mockMvc.perform(patch("/api/admin/business-owners/" + ownerId + "/deactivate")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("INACTIVE"));

		mockMvc.perform(patch("/api/admin/business-owners/" + ownerId + "/activate")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"));

		// 6. Search & Paginate Owners
		mockMvc.perform(get("/api/admin/business-owners")
						.session(session)
						.param("search", "Johnny")
						.param("status", "ACTIVE")
						.param("page", "0")
						.param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
				.andExpect(header().exists("X-Total-Count"));

		// 7. Delete Owner
		mockMvc.perform(delete("/api/admin/business-owners/" + ownerId)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/admin/business-owners/" + ownerId)
						.session(session))
				.andExpect(status().isNotFound());
	}

	@Test
	void organizationAndRelationshipIntegrationTest() throws Exception {
		LoginRequest loginReq = new LoginRequest("superadmin@hiikky.com", "SuperAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(loginReq)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		// 1. Create a business owner
		String owner1Email = "owner1_" + System.currentTimeMillis() + "@test.com";
		CreateBusinessOwnerRequest owner1Req = new CreateBusinessOwnerRequest("Alice", "Smith", owner1Email, "111");
		var owner1Res = mockMvc.perform(post("/api/admin/business-owners")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(owner1Req)))
				.andExpect(status().isCreated())
				.andReturn();
		long owner1Id = objectMapper.readTree(owner1Res.getResponse().getContentAsString()).get("data").get("id").asLong();

		String owner2Email = "owner2_" + System.currentTimeMillis() + "@test.com";
		CreateBusinessOwnerRequest owner2Req = new CreateBusinessOwnerRequest("Bob", "Jones", owner2Email, "222");
		var owner2Res = mockMvc.perform(post("/api/admin/business-owners")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(owner2Req)))
				.andExpect(status().isCreated())
				.andReturn();
		long owner2Id = objectMapper.readTree(owner2Res.getResponse().getContentAsString()).get("data").get("id").asLong();

		// 2. Create organization linked to owner1
		String orgName = "Org_" + System.currentTimeMillis();
		String orgEmail = "org_" + System.currentTimeMillis() + "@test.com";
		CreateOrganizationRequest orgReq = new CreateOrganizationRequest(orgName, owner1Id, orgEmail, "555-1234", "101 High St");
		var orgRes = mockMvc.perform(post("/api/admin/organizations")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(orgReq)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.name").value(orgName))
				.andExpect(jsonPath("$.data.ownerId").value(owner1Id))
				.andExpect(jsonPath("$.data.ownerName").value("Alice Smith"))
				.andExpect(jsonPath("$.data.status").value("ACTIVE"))
				.andReturn();
		long orgId = objectMapper.readTree(orgRes.getResponse().getContentAsString()).get("data").get("id").asLong();

		mockMvc.perform(get("/api/admin/business-owners")
						.session(session)
						.param("organizationId", String.valueOf(orgId))
						.param("status", "ACTIVE")
						.param("search", "Alice")
						.param("sortBy", "email")
						.param("sortDirection", "DESC"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Total-Count", "1"))
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(jsonPath("$.data[0].email").value(owner1Email))
				.andExpect(jsonPath("$.data[0].organizations[0].id").value(orgId));

		// 3. Duplicate checks
		CreateOrganizationRequest dupNameReq = new CreateOrganizationRequest(orgName, null, "unique_" + System.currentTimeMillis() + "@test.com", null, null);
		mockMvc.perform(post("/api/admin/organizations")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dupNameReq)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message", containsString("already exists")));

		CreateOrganizationRequest dupEmailReq = new CreateOrganizationRequest("UniqueOrg_" + System.currentTimeMillis(), null, orgEmail, null, null);
		mockMvc.perform(post("/api/admin/organizations")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(dupEmailReq)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message", containsString("already exists")));

		// 4. View Organization Details
		mockMvc.perform(get("/api/admin/organizations/" + orgId)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id").value(orgId))
				.andExpect(jsonPath("$.data.ownerName").value("Alice Smith"));

		// 5. Relationship check: organizations of owner1
		mockMvc.perform(get("/api/admin/business-owners/" + owner1Id + "/organizations")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(jsonPath("$.data[0].id").value(orgId));

		// 6. Relationship management: Reassign organization to owner2
		mockMvc.perform(put("/api/admin/organizations/" + orgId + "/owner/" + owner2Id)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.ownerId").value(owner2Id))
				.andExpect(jsonPath("$.data.ownerName").value("Bob Jones"));

		// 7. Get owner of organization
		mockMvc.perform(get("/api/admin/organizations/" + orgId + "/owner")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id").value(owner2Id))
				.andExpect(jsonPath("$.data.fullName").value("Bob Jones"));

		// 8. Remove owner from organization
		mockMvc.perform(delete("/api/admin/organizations/" + orgId + "/owner")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.ownerId").doesNotExist());

		// 9. Deactivate & Activate Organization
		mockMvc.perform(patch("/api/admin/organizations/" + orgId + "/deactivate")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("INACTIVE"));

		mockMvc.perform(patch("/api/admin/organizations/" + orgId + "/activate")
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"));

		// 10. Search & Filter Organizations
		mockMvc.perform(get("/api/admin/organizations")
						.session(session)
						.param("search", orgName)
						.param("status", "ACTIVE")
						.param("page", "0")
						.param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(header().exists("X-Total-Count"));

		// 11. Delete Organization
		mockMvc.perform(delete("/api/admin/organizations/" + orgId)
						.session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));

		mockMvc.perform(get("/api/admin/organizations/" + orgId)
						.session(session))
				.andExpect(status().isNotFound());
	}

	@Test
	void dashboardReportsDatabaseBackedMetricsWithinInclusiveDateRange() throws Exception {
		LoginRequest loginReq = new LoginRequest("superadmin@hiikky.com", "SuperAdminPassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(loginReq)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		String ownerEmail = "dashboard_" + System.currentTimeMillis() + "@test.com";
		CreateBusinessOwnerRequest createReq = new CreateBusinessOwnerRequest("Dashboard", "Owner", ownerEmail, "123");
		mockMvc.perform(post("/api/admin/business-owners")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isCreated());

		String today = LocalDate.now().toString();
		mockMvc.perform(get("/api/admin/dashboard")
						.session(session)
						.param("fromDate", today)
						.param("toDate", today))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.fromDate").value(today))
				.andExpect(jsonPath("$.data.toDate").value(today))
				.andExpect(jsonPath("$.data.adminAccounts.enabled", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.recentActivityPage").value(0))
				.andExpect(jsonPath("$.data.recentActivitySize").value(20))
				.andExpect(jsonPath("$.data.platformSummary.businessOwnerCount", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.businessOwners.registeredInRange", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.recentActivity[0].displayName").value("Dashboard Owner"));

		mockMvc.perform(get("/api/admin/analytics/registrations")
						.session(session)
						.param("fromDate", today)
						.param("toDate", today)
						.param("groupBy", "MONTH"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.groupBy").value("MONTH"))
				.andExpect(jsonPath("$.data.summary.businessOwnerRegistrations", greaterThanOrEqualTo(1)))
				.andExpect(jsonPath("$.data.periods[0].periodStart").value(today.substring(0, 7) + "-01"));

		mockMvc.perform(get("/api/admin/dashboard")
						.session(session)
						.param("fromDate", "2099-01-01")
						.param("toDate", "2099-01-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.businessOwners.registeredInRange").value(0))
				.andExpect(jsonPath("$.data.recentActivity", hasSize(0)))
				.andExpect(jsonPath("$.data.recentActivityTotal").value(0));

		mockMvc.perform(get("/api/admin/analytics/registrations")
						.session(session)
						.param("fromDate", "2099-01-01")
						.param("toDate", "2099-01-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.periods", hasSize(0)))
				.andExpect(jsonPath("$.data.summary.organizationRegistrations").value(0));
	}

	@Test
	void adminCanUpdateOwnProfileAfterPasswordVerification() throws Exception {
		String originalEmail = "profile_" + System.currentTimeMillis() + "@test.com";
		AdminAccount account = new AdminAccount();
		account.setEmail(originalEmail);
		account.setPasswordHash(passwordEncoder.encode("ProfilePassword123"));
		account.setRole(AdminRole.ADMIN);
		account.setEnabled(true);
		adminAccountRepository.save(account);

		LoginRequest loginRequest = new LoginRequest(originalEmail, "ProfilePassword123");
		var loginResult = mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(loginRequest)))
				.andExpect(status().isOk())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) loginResult.getRequest().getSession();

		mockMvc.perform(get("/api/admin/profile").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.email").value(originalEmail))
				.andExpect(jsonPath("$.data.role").value("ADMIN"))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist());

		mockMvc.perform(patch("/api/admin/profile")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"currentPassword":"wrong-password","email":"changed@example.com"}
								"""))
				.andExpect(status().isUnauthorized());

		String changedEmail = "profile_changed_" + System.currentTimeMillis() + "@test.com";
		mockMvc.perform(patch("/api/admin/profile")
						.session(session)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(java.util.Map.of(
								"currentPassword", "ProfilePassword123",
								"email", changedEmail,
								"newPassword", "ChangedPassword456"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.email").value(changedEmail))
				.andExpect(jsonPath("$.data.role").value("ADMIN"))
				.andExpect(jsonPath("$.data.passwordHash").doesNotExist());

		mockMvc.perform(get("/api/admin/profile").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.email").value(changedEmail));

		mockMvc.perform(post("/api/admin/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(
								new LoginRequest(changedEmail, "ChangedPassword456"))))
				.andExpect(status().isOk());
	}
}
