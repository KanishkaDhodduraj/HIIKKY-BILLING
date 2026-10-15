package com.hiikky.admin.controller;

import com.hiikky.admin.config.SecurityConfig;
import com.hiikky.admin.dto.AccountStatusRequest;
import com.hiikky.admin.dto.AdminAccountResponse;
import com.hiikky.admin.dto.CreateAdminAccountRequest;
import com.hiikky.admin.dto.UpdateAdminAccountRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.exception.SuperAdminProtectionException;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.security.AdminUserDetailsService;
import com.hiikky.admin.service.AdminAccountService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminAccountController.class)
@Import(SecurityConfig.class)
class AdminAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminAccountService adminAccountService;

    @MockitoBean
    private AdminUserDetailsService adminUserDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Super admin can list accounts successfully")
    @WithMockUser(roles = "SUPER_ADMIN")
    void listAccountsSuccess() throws Exception {
        AdminAccountResponse dummy = new AdminAccountResponse(
                1L,
                "admin@example.com",
                AdminRole.ADMIN,
                true,
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now()
        );
        List<AdminAccountResponse> list = Collections.singletonList(dummy);
        Mockito.when(adminAccountService.listAdminAccounts(0, 20, null, null, null)).thenReturn(list);
        Mockito.when(adminAccountService.countAdminAccounts(null, null, null)).thenReturn(1L);

        mockMvc.perform(get("/api/admin/accounts")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "1"))
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].email", is("admin@example.com")));
    }

    @Test
    @DisplayName("Non‑SUPER_ADMIN is forbidden from listing accounts")
    @WithMockUser(roles = "ADMIN")
    void listAccountsForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/accounts"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Invalid page size returns 400")
    @WithMockUser(roles = "SUPER_ADMIN")
    void listAccountsInvalidSize() throws Exception {
        mockMvc.perform(get("/api/admin/accounts")
                        .param("size", "200"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Page size")));
    }

    @Test
    @DisplayName("Get account by ID returns account details")
    @WithMockUser(roles = "SUPER_ADMIN")
    void getAccountByIdSuccess() throws Exception {
        AdminAccountResponse dummy = new AdminAccountResponse(
                1L,
                "super@example.com",
                AdminRole.SUPER_ADMIN,
                true,
                LocalDateTime.now().minusDays(2),
                LocalDateTime.now()
        );
        Mockito.when(adminAccountService.getAccountById(1L)).thenReturn(dummy);

        mockMvc.perform(get("/api/admin/accounts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("super@example.com")))
                .andExpect(jsonPath("$.data.role", is("SUPER_ADMIN")));
    }

    @Test
    @DisplayName("Get non-existent account returns 404")
    @WithMockUser(roles = "SUPER_ADMIN")
    void getAccountByIdNotFound() throws Exception {
        Mockito.when(adminAccountService.getAccountById(999L))
                .thenThrow(new ResourceNotFoundException("Admin account not found with id: 999"));

        mockMvc.perform(get("/api/admin/accounts/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    @DisplayName("Create account successfully returns 201")
    @WithMockUser(roles = "SUPER_ADMIN")
    void createAccountSuccess() throws Exception {
        CreateAdminAccountRequest req = new CreateAdminAccountRequest("newadmin@example.com", "Password@123", AdminRole.ADMIN);
        AdminAccountResponse resp = new AdminAccountResponse(2L, "newadmin@example.com", AdminRole.ADMIN, true, LocalDateTime.now(), LocalDateTime.now());

        Mockito.when(adminAccountService.createAdminAccount(Mockito.any(CreateAdminAccountRequest.class)))
                .thenReturn(resp);

        mockMvc.perform(post("/api/admin/accounts").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(2)))
                .andExpect(jsonPath("$.data.email", is("newadmin@example.com")));
    }

    @Test
    @DisplayName("Create duplicate account returns 409")
    @WithMockUser(roles = "SUPER_ADMIN")
    void createAccountDuplicate() throws Exception {
        CreateAdminAccountRequest req = new CreateAdminAccountRequest("existing@example.com", "Password@123", AdminRole.ADMIN);

        Mockito.when(adminAccountService.createAdminAccount(Mockito.any(CreateAdminAccountRequest.class)))
                .thenThrow(new DuplicateResourceException("An admin account with email 'existing@example.com' already exists"));

        mockMvc.perform(post("/api/admin/accounts").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Update account successfully returns 200")
    @WithMockUser(roles = "SUPER_ADMIN")
    void updateAccountSuccess() throws Exception {
        UpdateAdminAccountRequest req = new UpdateAdminAccountRequest("updated@example.com", AdminRole.ADMIN, true, null);
        AdminAccountResponse resp = new AdminAccountResponse(1L, "updated@example.com", AdminRole.ADMIN, true, LocalDateTime.now().minusDays(1), LocalDateTime.now());

        Mockito.when(adminAccountService.updateAdminAccount(Mockito.eq(1L), Mockito.any(UpdateAdminAccountRequest.class)))
                .thenReturn(resp);

        mockMvc.perform(put("/api/admin/accounts/1").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("updated@example.com")));
    }

    @Test
    @DisplayName("Protect last active SUPER_ADMIN from deactivation returns 400")
    @WithMockUser(roles = "SUPER_ADMIN")
    void deactivateLastSuperAdminProtected() throws Exception {
        Mockito.when(adminAccountService.setAccountStatus(1L, false))
                .thenThrow(new SuperAdminProtectionException("Cannot deactivate the last active SUPER_ADMIN account"));

        mockMvc.perform(patch("/api/admin/accounts/1/deactivate").with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("Cannot deactivate the last active SUPER_ADMIN")));
    }

    @Test
    @DisplayName("Delete account returns 200")
    @WithMockUser(roles = "SUPER_ADMIN")
    void deleteAccountSuccess() throws Exception {
        mockMvc.perform(delete("/api/admin/accounts/2").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("deleted")));

        Mockito.verify(adminAccountService).deleteAdminAccount(2L);
    }
}
