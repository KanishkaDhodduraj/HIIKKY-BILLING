package com.hiikky.admin.service;

import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateOrganizationRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.UpdateOrganizationRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.BusinessOwner;
import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OrganizationStatus;
import com.hiikky.admin.repository.BusinessOwnerRepository;
import com.hiikky.admin.repository.OrganizationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final BusinessOwnerRepository businessOwnerRepository;

    public OrganizationService(OrganizationRepository organizationRepository,
                               BusinessOwnerRepository businessOwnerRepository) {
        this.organizationRepository = organizationRepository;
        this.businessOwnerRepository = businessOwnerRepository;
    }

    public List<OrganizationResponse> listOrganizations(int page, int size, OrganizationStatus status, Long ownerId, String search) {
        int offset = page * size;
        List<Organization> orgs = organizationRepository.findAll(offset, size, status, ownerId, search);
        return orgs.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public long countOrganizations(OrganizationStatus status, Long ownerId, String search) {
        return organizationRepository.countWithFilters(status, ownerId, search);
    }

    public OrganizationResponse getOrganizationById(Long id) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + id));
        return toResponse(org);
    }

    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        String name = request.getName().trim();
        if (organizationRepository.existsByName(name)) {
            throw new DuplicateResourceException("An organization with name '" + name + "' already exists");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (organizationRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("An organization with email '" + email + "' already exists");
        }

        if (request.getOwnerId() != null) {
            if (!businessOwnerRepository.existsById(request.getOwnerId())) {
                throw new ResourceNotFoundException("Business owner not found with id: " + request.getOwnerId());
            }
        }

        Organization org = new Organization();
        org.setName(name);
        org.setOwnerId(request.getOwnerId());
        org.setEmail(email);
        org.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        org.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
        org.setStatus(OrganizationStatus.ACTIVE);

        Organization saved = organizationRepository.save(org);
        return toResponse(saved);
    }

    public OrganizationResponse updateOrganization(Long id, UpdateOrganizationRequest request) {
        Organization existing = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + id));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String newName = request.getName().trim();
            if (!newName.equalsIgnoreCase(existing.getName())) {
                if (organizationRepository.existsByNameAndIdNot(newName, id)) {
                    throw new DuplicateResourceException("Organization name '" + newName + "' is already in use");
                }
                existing.setName(newName);
            }
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(existing.getEmail())) {
                if (organizationRepository.existsByEmailAndIdNot(newEmail, id)) {
                    throw new DuplicateResourceException("Organization email '" + newEmail + "' is already in use");
                }
                existing.setEmail(newEmail);
            }
        }

        if (request.getOwnerId() != null) {
            if (!businessOwnerRepository.existsById(request.getOwnerId())) {
                throw new ResourceNotFoundException("Business owner not found with id: " + request.getOwnerId());
            }
            existing.setOwnerId(request.getOwnerId());
        }

        if (request.getPhone() != null) {
            existing.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null) {
            existing.setAddress(request.getAddress().trim());
        }
        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        }

        Organization updated = organizationRepository.save(existing);
        return toResponse(updated);
    }

    public OrganizationResponse setOrganizationStatus(Long id, OrganizationStatus status) {
        Organization existing = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + id));

        existing.setStatus(status);
        Organization updated = organizationRepository.save(existing);
        return toResponse(updated);
    }

    public void deleteOrganization(Long id) {
        if (!organizationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Organization not found with id: " + id);
        }
        organizationRepository.deleteById(id);
    }

    public OrganizationResponse assignOwner(Long organizationId, Long ownerId) {
        Organization existing = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + organizationId));

        BusinessOwner owner = businessOwnerRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + ownerId));

        organizationRepository.updateOwner(organizationId, ownerId);
        existing.setOwnerId(ownerId);
        return OrganizationResponse.from(existing, owner.getFullName());
    }

    public OrganizationResponse removeOwner(Long organizationId) {
        Organization existing = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + organizationId));

        organizationRepository.updateOwner(organizationId, null);
        existing.setOwnerId(null);
        return OrganizationResponse.from(existing, null);
    }

    public BusinessOwnerResponse getOwnerOfOrganization(Long organizationId) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + organizationId));

        if (org.getOwnerId() == null) {
            throw new ResourceNotFoundException("No business owner assigned to organization with id: " + organizationId);
        }

        BusinessOwner owner = businessOwnerRepository.findById(org.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + org.getOwnerId()));

        List<Organization> orgs = organizationRepository.findByOwnerId(owner.getId());
        List<OrganizationResponse> orgResponses = orgs.stream()
                .map(o -> OrganizationResponse.from(o, owner.getFullName()))
                .collect(Collectors.toList());
        return BusinessOwnerResponse.from(owner, orgResponses);
    }

    private OrganizationResponse toResponse(Organization org) {
        String ownerName = null;
        if (org.getOwnerId() != null) {
            ownerName = businessOwnerRepository.findById(org.getOwnerId())
                    .map(BusinessOwner::getFullName)
                    .orElse(null);
        }
        return OrganizationResponse.from(org, ownerName);
    }
}
