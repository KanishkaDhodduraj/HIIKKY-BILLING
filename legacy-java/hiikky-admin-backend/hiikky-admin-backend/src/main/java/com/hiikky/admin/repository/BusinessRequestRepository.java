package com.hiikky.admin.repository;

import com.hiikky.admin.dto.BusinessRequestSubmission;
import com.hiikky.admin.model.BusinessRequest;
import com.hiikky.admin.model.BusinessRequestHistory;
import com.hiikky.admin.model.BusinessRequestSearchCriteria;
import com.hiikky.admin.model.BusinessRequestStatus;

import java.util.List;
import java.util.Optional;

public interface BusinessRequestRepository {

    BusinessRequest create(BusinessRequestSubmission submission, String pendingIdentityHash);

    List<BusinessRequest> findAll(BusinessRequestSearchCriteria criteria, int offset);

    long count(BusinessRequestSearchCriteria criteria);

    Optional<BusinessRequest> findById(Long id);

    Optional<BusinessRequest> findByIdForUpdate(Long id);

    List<BusinessRequestHistory> findHistory(Long requestId);

    void decide(Long id, BusinessRequestStatus status, String reason,
                Long adminId, Long ownerId, Long organizationId);

    boolean existsPendingIdentity(String pendingIdentityHash);

    boolean existsOwnerEmail(String email);

    boolean existsOrganizationName(String name);

    boolean existsOrganizationEmail(String email);
}
