package com.hiikky.admin.dto;

import com.hiikky.admin.model.BusinessOwner;
import com.hiikky.admin.model.OwnerStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class BusinessOwnerResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private OwnerStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrganizationResponse> organizations = new ArrayList<>();

    public BusinessOwnerResponse() {
    }

    public BusinessOwnerResponse(Long id, String firstName, String lastName, String fullName, String email, String phone, OwnerStatus status, LocalDateTime createdAt, LocalDateTime updatedAt, List<OrganizationResponse> organizations) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        if (organizations != null) {
            this.organizations = organizations;
        }
    }

    public static BusinessOwnerResponse from(BusinessOwner owner, List<OrganizationResponse> organizations) {
        if (owner == null) return null;
        return new BusinessOwnerResponse(
                owner.getId(),
                owner.getFirstName(),
                owner.getLastName(),
                owner.getFullName(),
                owner.getEmail(),
                owner.getPhone(),
                owner.getStatus(),
                owner.getCreatedAt(),
                owner.getUpdatedAt(),
                organizations
        );
    }

    public static BusinessOwnerResponse from(BusinessOwner owner) {
        return from(owner, new ArrayList<>());
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public OwnerStatus getStatus() {
        return status;
    }

    public void setStatus(OwnerStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<OrganizationResponse> getOrganizations() {
        return organizations;
    }

    public void setOrganizations(List<OrganizationResponse> organizations) {
        this.organizations = organizations;
    }
}
