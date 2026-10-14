package com.hiikky.admin.service;

import com.hiikky.admin.dto.BusinessOwnerResponse;
import com.hiikky.admin.dto.CreateBusinessOwnerRequest;
import com.hiikky.admin.dto.OrganizationResponse;
import com.hiikky.admin.dto.UpdateBusinessOwnerRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.BusinessOwner;
import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.repository.BusinessOwnerRepository;
import com.hiikky.admin.repository.OrganizationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
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
        int offset = page * size;
        List<BusinessOwner> owners = businessOwnerRepository.findAll(offset, size, status, search);
        return owners.stream()
                .map(owner -> {
                    List<Organization> orgs = organizationRepository.findByOwnerId(owner.getId());
                    List<OrganizationResponse> orgResponses = orgs.stream()
                            .map(o -> OrganizationResponse.from(o, owner.getFullName()))
                            .collect(Collectors.toList());
                    return BusinessOwnerResponse.from(owner, orgResponses);
                })
                .collect(Collectors.toList());
    }

    public long countOwners(OwnerStatus status, String search) {
        return businessOwnerRepository.countWithFilters(status, search);
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

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(existing.getEmail())) {
                if (businessOwnerRepository.existsByEmailAndIdNot(newEmail, id)) {
                    throw new DuplicateResourceException("Email '" + newEmail + "' is already in use by another business owner");
                }
                existing.setEmail(newEmail);
            }
        }

        if (request.getFirstName() != null && !request.getFirstName().trim().isEmpty()) {
            existing.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            existing.setLastName(request.getLastName().trim());
        }
        if (request.getPhone() != null) {
            existing.setPhone(request.getPhone().trim());
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

    public BusinessOwnerResponse setOwnerStatus(Long id, OwnerStatus status) {
        BusinessOwner existing = businessOwnerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business owner not found with id: " + id));

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
