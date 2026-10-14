package com.hiikky.admin.dto;

import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OrganizationStatus;

import java.time.LocalDateTime;

public class OrganizationResponse {

    private Long id;
    private String name;
    private Long ownerId;
    private String ownerName;
    private String email;
    private String phone;
    private String address;
    private OrganizationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public OrganizationResponse() {
    }

    public OrganizationResponse(Long id, String name, Long ownerId, String ownerName, String email, String phone, String address, OrganizationStatus status, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static OrganizationResponse from(Organization org, String ownerName) {
        if (org == null) return null;
        return new OrganizationResponse(
                org.getId(),
                org.getName(),
                org.getOwnerId(),
                ownerName,
                org.getEmail(),
                org.getPhone(),
                org.getAddress(),
                org.getStatus(),
                org.getCreatedAt(),
                org.getUpdatedAt()
        );
    }

    public static OrganizationResponse from(Organization org) {
        return from(org, null);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
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

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationStatus status) {
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
}
