package com.hiikky.admin.service;

import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateBusinessOwnerRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.UpdateBusinessOwnerRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.BusinessOwner;
import com.hiikky.admin.model.BusinessOwnerSortField;
import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.model.SortDirection;
import com.hiikky.admin.repository.BusinessOwnerRepository;
import com.hiikky.admin.repository.OrganizationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BusinessOwnerService {

    private final BusinessOwnerRepository businessOwnerRepository;
    private final OrganizationRepository organizationRepository;

    public BusinessOwnerService(BusinessOwnerRepository businessOwnerRepository,
                                OrganizationRepository organizationRepository) {
        this.businessOwnerRepository = businessOwnerRepository;
        this.organizationRepository = organizationRepository;
    }

    public List<BusinessOwnerResponse> listOwners(int page, int size, OwnerStatus status, String search) {
        return listOwners(page, size, status, search, null, BusinessOwnerSortField.ID, SortDirection.ASC);
    }

    public List<BusinessOwnerResponse> listOwners(
            int page, int size, OwnerStatus status, String search, Long organizationId,
            BusinessOwnerSortField sortField, SortDirection sortDirection) {
        int offset;
        try {
            offset = Math.multiplyExact(page, size);
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Page index is too large", exception);
        }
        if (organizationId != null && !organizationRepository.existsById(organizationId)) {
            throw new ResourceNotFoundException("Organization not found with id: " + organizationId);
        }
        List<BusinessOwner> owners = businessOwnerRepository.findAll(
                offset, size, status, search, organizationId, sortField, sortDirection);
        Map<Long, List<Organization>> organizationsByOwner = organizationRepository.findByOwnerIds(
                        owners.stream().map(BusinessOwner::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(Organization::getOwnerId));
        return owners.stream()
                .map(owner -> {
                    List<OrganizationResponse> orgResponses = organizationsByOwner
                            .getOrDefault(owner.getId(), List.of()).stream()
                            .map(o -> OrganizationResponse.from(o, owner.getFullName()))
                            .toList();
                    return BusinessOwnerResponse.from(owner, orgResponses);
                })
                .toList();
    }

    public long countOwners(OwnerStatus status, String search) {
        return businessOwnerRepository.countWithFilters(status, search);
    }

    public long countOwners(OwnerStatus status, String search, Long organizationId) {
        return businessOwnerRepository.countWithFilters(status, search, organizationId);
    }

    public BusinessOwnerResponse getOwnerById(Long id) {
        BusinessOwner owner = businessOwnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + id));
        List<Organization> orgs = organizationRepository.findByOwnerId(owner.getId());
        List<OrganizationResponse> orgResponses = orgs.stream()
                .map(o -> OrganizationResponse.from(o, owner.getFullName()))
                .collect(Collectors.toList());
        return BusinessOwnerResponse.from(owner, orgResponses);
    }

    public BusinessOwnerResponse createOwner(CreateBusinessOwnerRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (businessOwnerRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("A business owner with email '" + email + "' already exists");
        }

        BusinessOwner owner = new BusinessOwner();
        owner.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null) {
            owner.setLastName(request.getLastName().trim());
        }
        owner.setEmail(email);
        owner.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        owner.setStatus(OwnerStatus.ACTIVE);

        BusinessOwner saved = businessOwnerRepository.save(owner);
        return BusinessOwnerResponse.from(saved);
    }

    public BusinessOwnerResponse updateOwner(Long id, UpdateBusinessOwnerRequest request) {
        BusinessOwner existing = businessOwnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + id));

        if (request.getEmail() != null) {
            if (request.getEmail().isBlank()) {
                throw new IllegalArgumentException("Email must not be blank");
            }
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(existing.getEmail())) {
                if (businessOwnerRepository.existsByEmailAndIdNot(newEmail, id)) {
                    throw new DuplicateResourceException("Email '" + newEmail + "' is already in use by another business owner");
                }
                existing.setEmail(newEmail);
            }
        }

        if (request.getFirstName() != null) {
            if (request.getFirstName().isBlank()) {
                throw new IllegalArgumentException("First name must not be blank");
            }
            existing.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            existing.setLastName(trimToNull(request.getLastName()));
        }
        if (request.getPhone() != null) {
            existing.setPhone(trimToNull(request.getPhone()));
        }
        if (request.getStatus() != null) {
            existing.setStatus(request.getStatus());
        }

        BusinessOwner updated = businessOwnerRepository.save(existing);
        List<Organization> orgs = organizationRepository.findByOwnerId(updated.getId());
        List<OrganizationResponse> orgResponses = orgs.stream()
                .map(o -> OrganizationResponse.from(o, updated.getFullName()))
                .collect(Collectors.toList());
        return BusinessOwnerResponse.from(updated, orgResponses);
    }

    private String trimToNull(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public BusinessOwnerResponse setOwnerStatus(Long id, OwnerStatus status) {
        BusinessOwner existing = businessOwnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + id));

        if (existing.getStatus() == status) {
            List<OrganizationResponse> orgResponses = organizationRepository.findByOwnerId(existing.getId()).stream()
                    .map(org -> OrganizationResponse.from(org, existing.getFullName()))
                    .toList();
            return BusinessOwnerResponse.from(existing, orgResponses);
        }
        existing.setStatus(status);
        BusinessOwner updated = businessOwnerRepository.save(existing);
        List<Organization> orgs = organizationRepository.findByOwnerId(updated.getId());
        List<OrganizationResponse> orgResponses = orgs.stream()
                .map(o -> OrganizationResponse.from(o, updated.getFullName()))
                .collect(Collectors.toList());
        return BusinessOwnerResponse.from(updated, orgResponses);
    }

    public void deleteOwner(Long id) {
        if (!businessOwnerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Business owner not found with id: " + id);
        }
        businessOwnerRepository.deleteById(id);
    }

    public List<OrganizationResponse> getOrganizationsByOwner(Long ownerId) {
        BusinessOwner owner = businessOwnerRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + ownerId));
        return organizationRepository.findByOwnerId(ownerId).stream()
                .map(org -> OrganizationResponse.from(org, owner.getFullName()))
                .collect(Collectors.toList());
    }
}
