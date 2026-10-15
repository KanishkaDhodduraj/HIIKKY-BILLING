package com.hiikky.admin.controller;

import com.hiikky.admin.dto.ApiResponse;
import com.hiikky.admin.dto.BusinessRequestSubmission;
import com.hiikky.admin.dto.BusinessRequestSubmissionResponse;
import com.hiikky.admin.security.PublicSubmissionRateLimiter;
import com.hiikky.admin.service.BusinessRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/organization-registration-applications")
public class BusinessRequestIntakeController {

    private final BusinessRequestService requestService;
    private final PublicSubmissionRateLimiter rateLimiter;

    public BusinessRequestIntakeController(BusinessRequestService requestService,
                                           PublicSubmissionRateLimiter rateLimiter) {
        this.requestService = requestService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BusinessRequestSubmissionResponse>> submit(
            @Valid @RequestBody BusinessRequestSubmission submission,
            HttpServletRequest httpRequest) {
        rateLimiter.checkAndRecord(httpRequest.getRemoteAddr());
        BusinessRequestSubmissionResponse created = requestService.submit(submission);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Organization registration application submitted", created));
    }
}
