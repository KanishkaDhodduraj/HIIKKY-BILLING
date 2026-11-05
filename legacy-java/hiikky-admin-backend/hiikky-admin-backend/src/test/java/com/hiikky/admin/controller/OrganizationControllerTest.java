package com.hiikky.admin.controller;

import com.hiikky.admin.config.SecurityConfig;
import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateOrganizationRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.UpdateOrganizationRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.OrganizationStatus;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.security.AdminUserDetailsService;
import com.hiikky.admin.service.OrganizationService;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrganizationController.class)
@Import(SecurityConfig.class)
class OrganizationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrganizationService organizationService;

    @MockitoBean
    private AdminUserDetailsService adminUserDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Admin can list organizations with pagination and filters")
    @WithMockUser(roles = "ADMIN")
    void listOrganizationsSuccess() throws Exception {
        OrganizationResponse org = new OrganizationResponse(
                1L, "EduTech Global", 5L, "Jane Doe", "info@edutech.com", "12345678", "456 Avenue",
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );
        Mockito.when(organizationService.listOrganizations(0, 20, OrganizationStatus.ACTIVE, 5L, "Edu"))
                .thenReturn(Collections.singletonList(org));
        Mockito.when(organizationService.countOrganizations(OrganizationStatus.ACTIVE, 5L, "Edu"))
                .thenReturn(1L);

        mockMvc.perform(get("/api/admin/organizations")
                        .param("page", "0")
                        .param("size", "20")
                        .param("status", "ACTIVE")
                        .param("ownerId", "5")
                        .param("search", "Edu"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "1"))
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name", is("EduTech Global")));
    }

    @Test
    @DisplayName("View organization details by ID")
    @WithMockUser(roles = "ADMIN")
    void getOrganizationByIdSuccess() throws Exception {
        OrganizationResponse org = new OrganizationResponse(
                1L, "Global Edu", 3L, "Bob Ross", "contact@globaledu.com", "99988877", "789 Blvd",
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );
        Mockito.when(organizationService.getOrganizationById(1L)).thenReturn(org);

        mockMvc.perform(get("/api/admin/organizations/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Global Edu")))
                .andExpect(jsonPath("$.data.ownerName", is("Bob Ross")));
    }

    @Test
    @DisplayName("Create organization successfully returns 201 Created")
    @WithMockUser(roles = "ADMIN")
    void createOrganizationSuccess() throws Exception {
        CreateOrganizationRequest req = new CreateOrganizationRequest("LearnHub", 2L, "info@learnhub.com", "333444", "101 Center Way");
        OrganizationResponse resp = new OrganizationResponse(
                10L, "LearnHub", 2L, "Jane Doe", "info@learnhub.com", "333444", "101 Center Way",
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );

        Mockito.when(organizationService.createOrganization(Mockito.any(CreateOrganizationRequest.class))).thenReturn(resp);

        mockMvc.perform(post("/api/admin/organizations").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("LearnHub")));
    }

    @Test
    @DisplayName("Create organization with duplicate name returns 409 Conflict")
    @WithMockUser(roles = "ADMIN")
    void createOrganizationDuplicateName() throws Exception {
        CreateOrganizationRequest req = new CreateOrganizationRequest("ExistingOrg", 2L, "info@existing.com", "333444", "101 Center Way");

        Mockito.when(organizationService.createOrganization(Mockito.any(CreateOrganizationRequest.class)))
                .thenThrow(new DuplicateResourceException("An organization with name 'ExistingOrg' already exists"));

        mockMvc.perform(post("/api/admin/organizations").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Activate and deactivate organization")
    @WithMockUser(roles = "ADMIN")
    void activateAndDeactivateOrganization() throws Exception {
        OrganizationResponse activeResp = new OrganizationResponse(
                1L, "Org 1", null, null, "o1@example.com", null, null,
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );
        OrganizationResponse inactiveResp = new OrganizationResponse(
                1L, "Org 1", null, null, "o1@example.com", null, null,
                OrganizationStatus.INACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );

        Mockito.when(organizationService.setOrganizationStatus(1L, OrganizationStatus.ACTIVE)).thenReturn(activeResp);
        Mockito.when(organizationService.setOrganizationStatus(1L, OrganizationStatus.INACTIVE)).thenReturn(inactiveResp);

        mockMvc.perform(patch("/api/admin/organizations/1/activate").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        mockMvc.perform(patch("/api/admin/organizations/1/deactivate").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));
    }

    @Test
    @DisplayName("Assign owner to organization")
    @WithMockUser(roles = "ADMIN")
    void assignOwnerToOrganization() throws Exception {
        OrganizationResponse resp = new OrganizationResponse(
                1L, "Org 1", 10L, "New Owner", "o1@example.com", null, null,
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );
        Mockito.when(organizationService.assignOwner(1L, 10L)).thenReturn(resp);

        mockMvc.perform(put("/api/admin/organizations/1/owner/10").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.ownerId", is(10)))
                .andExpect(jsonPath("$.data.ownerName", is("New Owner")));
    }

    @Test
    @DisplayName("Remove owner from organization")
    @WithMockUser(roles = "ADMIN")
    void removeOwnerFromOrganization() throws Exception {
        OrganizationResponse resp = new OrganizationResponse(
                1L, "Org 1", null, null, "o1@example.com", null, null,
                OrganizationStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now()
        );
        Mockito.when(organizationService.removeOwner(1L)).thenReturn(resp);

        mockMvc.perform(delete("/api/admin/organizations/1/owner").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.ownerId").doesNotExist());
    }

    @Test
    @DisplayName("View owner of organization")
    @WithMockUser(roles = "ADMIN")
    void getOwnerOfOrganization() throws Exception {
        BusinessOwnerResponse owner = new BusinessOwnerResponse(
                10L, "Jane", "Doe", "Jane Doe", "jane@example.com", "123",
                OwnerStatus.ACTIVE, LocalDateTime.now(), LocalDateTime.now(), Collections.emptyList()
        );
        Mockito.when(organizationService.getOwnerOfOrganization(1L)).thenReturn(owner);

        mockMvc.perform(get("/api/admin/organizations/1/owner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.email", is("jane@example.com")));
    }

    @Test
    @DisplayName("Delete organization")
    @WithMockUser(roles = "ADMIN")
    void deleteOrganizationSuccess() throws Exception {
        mockMvc.perform(delete("/api/admin/organizations/1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", containsString("deleted")));

        Mockito.verify(organizationService).deleteOrganization(1L);
    }
}
