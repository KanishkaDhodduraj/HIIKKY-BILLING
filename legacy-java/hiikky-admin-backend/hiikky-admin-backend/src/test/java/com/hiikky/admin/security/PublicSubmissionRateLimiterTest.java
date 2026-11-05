package com.hiikky.admin.security;

import com.hiikky.admin.exception.PublicSubmissionRateLimitException;
import com.hiikky.admin.repository.AdminSettingRepository;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PublicSubmissionRateLimiterTest {

    @Test
    void appliesPersistedLimitAndReadsChangesImmediately() {
        AdminSettingRepository settings = mock(AdminSettingRepository.class);
        when(settings.getPublicRegistrationMaxSubmissions()).thenReturn(1, 1, 2, 2);
        PublicSubmissionRateLimiter limiter = new PublicSubmissionRateLimiter(
                settings, Clock.fixed(Instant.parse("2026-10-15T12:00:00Z"), ZoneId.of("UTC")));

        assertDoesNotThrow(() -> limiter.checkAndRecord("192.0.2.10"));
        assertThrows(PublicSubmissionRateLimitException.class,
                () -> limiter.checkAndRecord("192.0.2.10"));
        assertDoesNotThrow(() -> limiter.checkAndRecord("192.0.2.10"));
        assertThrows(PublicSubmissionRateLimitException.class,
                () -> limiter.checkAndRecord("192.0.2.10"));
    }
}
