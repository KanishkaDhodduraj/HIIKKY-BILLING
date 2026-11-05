package com.hiikky.admin.service;

import com.hiikky.admin.dto.BusinessRequestDetailResponse;
import com.hiikky.admin.dto.BusinessRequestHistoryResponse;
import com.hiikky.admin.dto.BusinessRequestRejection;
import com.hiikky.admin.dto.BusinessRequestSubmission;
import com.hiikky.admin.dto.BusinessRequestSubmissionResponse;
import com.hiikky.admin.dto.BusinessRequestSummaryResponse;
import com.hiikky.admin.dto.CreateBusinessOwnerRequest;
import com.hiikky.admin.dto.CreateOrganizationRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.InvalidBusinessRequestTransitionException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.BusinessRequest;
import com.hiikky.admin.model.BusinessRequestHistory;
import com.hiikky.admin.model.BusinessRequestSearchCriteria;
import com.hiikky.admin.model.BusinessRequestStatus;
import com.hiikky.admin.repository.BusinessRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
public class BusinessRequestService {

    private final BusinessRequestRepository requestRepository;
    private final BusinessOwnerService businessOwnerService;
    private final OrganizationService organizationService;

    public BusinessRequestService(BusinessRequestRepository requestRepository,
                                  BusinessOwnerService businessOwnerService,
                                  OrganizationService organizationService) {
        this.requestRepository = requestRepository;
        this.businessOwnerService = businessOwnerService;
        this.organizationService = organizationService;
    }

    @Transactional
    public BusinessRequestSubmissionResponse submit(BusinessRequestSubmission request) {
        BusinessRequestSubmission normalized = normalize(request);
        String identityHash = identityHash(normalized);
        if (requestRepository.existsPendingIdentity(identityHash)) {
            throw new DuplicateResourceException("A matching Business Request is already pending");
        }
        if (requestRepository.existsOwnerEmail(normalized.ownerEmail())
                || requestRepository.existsOrganizationName(normalized.organizationName())
                || requestRepository.existsOrganizationEmail(normalized.organizationEmail())) {
            throw new DuplicateResourceException(
                    "The submitted owner or organization details already exist on the platform");
        }
        BusinessRequest created = requestRepository.create(normalized, identityHash);
        return new BusinessRequestSubmissionResponse(
                created.id(), created.status(), created.createdAt());
    }

    public List<BusinessRequestSummaryResponse> list(BusinessRequestSearchCriteria criteria) {
        int offset;
        try {
            offset = Math.multiplyExact(criteria.page(), criteria.size());
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Page index is too large", exception);
        }
        return requestRepository.findAll(criteria, offset).stream()
                .map(this::toSummary)
                .toList();
    }

    public long count(BusinessRequestSearchCriteria criteria) {
        return requestRepository.count(criteria);
    }

    public BusinessRequestDetailResponse getById(Long id) {
        BusinessRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business Request not found with id: " + id));
        return toDetail(request);
    }

    @Transactional
    public BusinessRequestDetailResponse approve(Long id, Long adminId) {
        BusinessRequest request = lockPending(id);
        if (requestRepository.existsOwnerEmail(request.ownerEmail())
                || requestRepository.existsOrganizationName(request.organizationName())
                || requestRepository.existsOrganizationEmail(request.organizationEmail())) {
            throw new DuplicateResourceException(
                    "The owner or organization details now conflict with an existing platform record");
        }

        var owner = businessOwnerService.createOwner(new CreateBusinessOwnerRequest(
                request.firstName(), request.lastName(), request.ownerEmail(), request.ownerPhone()));
        var organization = organizationService.createOrganization(new CreateOrganizationRequest(
                request.organizationName(), owner.getId(), request.organizationEmail(),
                request.organizationPhone(), request.organizationAddress()));
        requestRepository.decide(id, BusinessRequestStatus.APPROVED, null,
                adminId, owner.getId(), organization.getId());
        return getById(id);
    }

    @Transactional
    public BusinessRequestDetailResponse reject(Long id, Long adminId, BusinessRequestRejection rejection) {
        BusinessRequest request = lockPending(id);
        String reason = rejection.reason().trim();
        requestRepository.decide(id, BusinessRequestStatus.REJECTED, reason, adminId, null, null);
        return getById(request.id());
    }

    private BusinessRequest lockPending(Long id) {
        BusinessRequest request = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business Request not found with id: " + id));
        if (request.status() != BusinessRequestStatus.PENDING) {
            throw new InvalidBusinessRequestTransitionException(
                    "Only pending Business Requests may be approved or rejected");
        }
        return request;
    }

    private BusinessRequestDetailResponse toDetail(BusinessRequest request) {
        List<BusinessRequestHistoryResponse> history = requestRepository.findHistory(request.id()).stream()
                .map(this::toHistory)
                .toList();
        return new BusinessRequestDetailResponse(
                request.id(), request.firstName(), request.lastName(), request.ownerEmail(),
                request.ownerPhone(), request.organizationName(), request.organizationEmail(),
                request.organizationPhone(), request.organizationAddress(), request.status(),
                request.decisionReason(), request.decidedByAdminId(), request.createdAt(),
                request.decidedAt(), request.createdOwnerId(), request.createdOrganizationId(), history);
    }

    private BusinessRequestSummaryResponse toSummary(BusinessRequest request) {
        return new BusinessRequestSummaryResponse(
                request.id(), request.firstName(), request.lastName(), request.ownerEmail(),
                request.organizationName(), request.organizationEmail(), request.status(),
                request.createdAt(), request.decidedAt());
    }

    private BusinessRequestHistoryResponse toHistory(BusinessRequestHistory event) {
        return new BusinessRequestHistoryResponse(
                event.id(), event.eventType(), event.actorAdminId(), event.reason(),
                event.createdOwnerId(), event.createdOrganizationId(), event.createdAt());
    }

    private BusinessRequestSubmission normalize(BusinessRequestSubmission request) {
        return new BusinessRequestSubmission(
                request.firstName().trim(),
                trimToNull(request.lastName()),
                request.ownerEmail().trim().toLowerCase(Locale.ROOT),
                trimToNull(request.ownerPhone()),
                request.organizationName().trim(),
                request.organizationEmail().trim().toLowerCase(Locale.ROOT),
                trimToNull(request.organizationPhone()),
                trimToNull(request.organizationAddress()));
    }

    private String identityHash(BusinessRequestSubmission request) {
        String normalizedIdentity = String.join("\u001f",
                request.ownerEmail().toLowerCase(Locale.ROOT),
                request.organizationName().toLowerCase(Locale.ROOT),
                request.organizationEmail().toLowerCase(Locale.ROOT));
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(normalizedIdentity.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
