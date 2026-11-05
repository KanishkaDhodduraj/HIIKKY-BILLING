package com.hiikky.admin.controller;

import com.hiikky.admin.config.SecurityConfig;
import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateBusinessOwnerRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.StatusUpdateRequest;
import com.hiikky.admin.dto.UpdateBusinessOwnerRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.OrganizationStatus;
import com.hiikky.admin.model.BusinessOwnerSortField;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.model.SortDirection;
import com.hiikky.admin.security.AdminUserDetailsService;
import com.hiikky.admin.service.BusinessOwnerService;
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

@WebMvcTest(BusinessOwnerController.class)
@Import(SecurityConfig.class)
class BusinessOwnerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BusinessOwnerService businessOwnerService;

    @MockitoBean
    private AdminUserDetailsService adminUserDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Admin can list business owners with pagination and filters")
    @WithMockUser(roles = "SUPER_ADMIN")
    void listOwnersSuccess() throws Exception {
        BusinessOwnerResponse dummy = new BusinessOwnerResponse(
                1L, "John", "Doe", "John Doe", "john@example.com", "1234567890",
                OwnerStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now(), Collections.emptyList()
        );
        Mockito.when(businessOwnerService.listOwners(
                        0, 20, OwnerStatus.ACTIVE, "John", null, BusinessOwnerSortField.ID, SortDirection.ASC))
                .thenReturn(Collections.singletonList(dummy));
        Mockito.when(businessOwnerService.countOwners(OwnerStatus.ACTIVE, "John", null))
                .thenReturn(1L);

        mockMvc.perform(get("/api/admin/business-owners")
                        .param("page", "0")
                        .param("size", "20")
                        .param("status", "ACTIVE")
                        .param("search", "John"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "1"))
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].email", is("john@example.com")));
    }

    @Test
    @DisplayName("View owner details by ID")
    @WithMockUser(roles = "SUPER_ADMIN")
    void getOwnerByIdSuccess() throws Exception {
        BusinessOwnerResponse dummy = new BusinessOwnerResponse(
                1L, "Jane", "Smith", "Jane Smith", "jane@example.com", "9876543210",
                OwnerStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now(), Collections.emptyList()
        );
        Mockito.when(businessOwnerService.getOwnerById(1L)).thenReturn(dummy);

        mockMvc.perform(get("/api/admin/business-owners/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.firstName", is("Jane")))
                .andExpect(jsonPath("$.data.email", is("jane@example.com")));
    }

    @Test
    @DisplayName("View non-existent owner returns 404")
    @WithMockUser(roles = "SUPER_ADMIN")
    void getOwnerByIdNotFound() throws Exception {
        Mockito.when(businessOwnerService.getOwnerById(99L))
                .thenThrow(new ResourceNotFoundException("Business owner not found with id: 99"));

        mockMvc.perform(get("/api/admin/business-owners/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    @DisplayName("Create business owner returns 201 Created")
    @WithMockUser(roles = "SUPER_ADMIN")
    void createOwnerSuccess() throws Exception {
        CreateBusinessOwnerRequest req = new CreateBusinessOwnerRequest("Alice", "Wonder", "alice@example.com", "5551234");
        BusinessOwnerResponse resp = new BusinessOwnerResponse(
                10L, "Alice", "Wonder", "Alice Wonder", "alice@example.com", "5551234",
                OwnerStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now(), Collections.emptyList()
        );

        Mockito.when(businessOwnerService.createOwner(Mockito.any(CreateBusinessOwnerRequest.class))).thenReturn(resp);

        mockMvc.perform(post("/api/admin/business-owners").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("alice@example.com")));
    }

    @Test
    @DisplayName("Create duplicate business owner returns 409 Conflict")
    @WithMockUser(roles = "SUPER_ADMIN")
    void createOwnerDuplicate() throws Exception {
        CreateBusinessOwnerRequest req = new CreateBusinessOwnerRequest("Alice", "Wonder", "alice@example.com", "5551234");

        Mockito.when(businessOwnerService.createOwner(Mockito.any(CreateBusinessOwnerRequest.class)))
                .thenThrow(new DuplicateResourceException("A business owner with email 'alice@example.com' already exists"));

        mockMvc.perform(post("/api/admin/business-owners").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Create business owner with invalid email returns 400 Bad Request")
    @WithMockUser(roles = "SUPER_ADMIN")
    void createOwnerInvalidEmail() throws Exception {
        CreateBusinessOwnerRequest req = new CreateBusinessOwnerRequest("Alice", "Wonder", "not-an-email", "5551234");

        mockMvc.perform(post("/api/admin/business-owners").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()));
    }

    @Test
    @DisplayName("Activate and deactivate business owner")
    @WithMockUser(roles = "SUPER_ADMIN")
    void activateAndDeactivateOwner() throws Exception {
        BusinessOwnerResponse activeResp = new BusinessOwnerResponse(
                1L, "Alice", "Wonder", "Alice Wonder", "alice@example.com", "5551234",
                OwnerStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now(), Collections.emptyList()
        );
        BusinessOwnerResponse inactiveResp = new BusinessOwnerResponse(
                1L, "Alice", "Wonder", "Alice Wonder", "alice@example.com", "5551234",
                OwnerStatus.INACTIVE, LocalDateTime.now(), LocalDateTime.now(), Collections.emptyList()
        );

        Mockito.when(businessOwnerService.setOwnerStatus(1L, OwnerStatus.ACTIVE)).thenReturn(activeResp);
        Mockito.when(businessOwnerService.setOwnerStatus(1L, OwnerStatus.INACTIVE)).thenReturn(inactiveResp);

        mockMvc.perform(patch("/api/admin/business-owners/1/activate").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        mockMvc.perform(patch("/api/admin/business-owners/1/deactivate").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));
    }

    @Test
    @DisplayName("Reject unsupported owner status instead of treating it as inactive")
    @WithMockUser(roles = "SUPER_ADMIN")
    void rejectsUnsupportedOwnerStatus() throws Exception {
        mockMvc.perform(patch("/api/admin/business-owners/1/status").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PENDING\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        Mockito.verifyNoInteractions(businessOwnerService);
    }

    @Test
    @DisplayName("View owner organizations")
    @WithMockUser(roles = "SUPER_ADMIN")
    void getOwnerOrganizations() throws Exception {
        OrganizationResponse org = new OrganizationResponse(
                5L, "Acme Academy", 1L, "John Doe", "contact@acme.com", "12345", "123 Main St",
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );
        Mockito.when(businessOwnerService.getOrganizationsByOwner(1L))
                .thenReturn(Collections.singletonList(org));

        mockMvc.perform(get("/api/admin/business-owners/1/organizations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name", is("Acme Academy")));
    }

    @Test
    @DisplayName("Delete business owner")
    @WithMockUser(roles = "SUPER_ADMIN")
    void deleteOwnerSuccess() throws Exception {
        mockMvc.perform(delete("/api/admin/business-owners/1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("deleted")));

        Mockito.verify(businessOwnerService).deleteOwner(1L);
    }

    @Test
    @DisplayName("Regular admin cannot manage business owners")
    @WithMockUser(roles = "ADMIN")
    void regularAdminCannotListOwners() throws Exception {
        mockMvc.perform(get("/api/admin/business-owners"))
                .andExpect(status().isForbidden());
    }
}
