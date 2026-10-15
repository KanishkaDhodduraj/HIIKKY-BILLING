package com.hiikky.admin.repository;

import com.hiikky.admin.model.BusinessOwner;
import com.hiikky.admin.model.OwnerStatus;
import com.hiikky.admin.model.BusinessOwnerSortField;
import com.hiikky.admin.model.SortDirection;

import java.util.List;
import java.util.Optional;

public interface BusinessOwnerRepository {

    Optional<BusinessOwner> findById(Long id);

    Optional<BusinessOwner> findByEmail(String email);

    boolean existsById(Long id);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    BusinessOwner save(BusinessOwner businessOwner);

    boolean deleteById(Long id);

    long count();

    long countWithFilters(OwnerStatus status, String search);

    List<BusinessOwner> findAll(int offset, int limit, OwnerStatus status, String search);

    long countWithFilters(OwnerStatus status, String search, Long organizationId);

    List<BusinessOwner> findAll(
            int offset, int limit, OwnerStatus status, String search, Long organizationId,
            BusinessOwnerSortField sortField, SortDirection sortDirection);
}
