package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.AdminAccountResponse;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.service.AdminAccountService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminAccountController.class)
class AdminAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminAccountService adminAccountService;

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
        Mockito.when(adminAccountService.listAdminAccounts(0, 20, null, null)).thenReturn(list);

        mockMvc.perform(get("/api/admin/accounts")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].email", is("admin@example.com")));
    }

    @Test
    @DisplayName("Non‑SUPER_ADMIN is forbidden")
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
}
