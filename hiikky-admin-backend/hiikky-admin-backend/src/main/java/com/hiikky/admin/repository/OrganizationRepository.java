package com.hiikky.admin.repository;

import com.hiikky.admin.model.Organization;
import com.hiikky.admin.model.OrganizationStatus;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository {

    Optional<Organization> findById(Long id);

    Optional<Organization> findByName(String name);

    Optional<Organization> findByEmail(String email);

    boolean existsById(Long id);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    Organization save(Organization organization);

    boolean deleteById(Long id);

    List<Organization> findByOwnerId(Long ownerId);

    long countByOwnerId(Long ownerId);

    long count();

    long countWithFilters(OrganizationStatus status, Long ownerId, String search);

    List<Organization> findAll(int offset, int limit, OrganizationStatus status, Long ownerId, String search);

    boolean updateOwner(Long organizationId, Long ownerId);
}
