package com.hiikky.admin.security;

import com.hiikky.admin.exception.LoginRateLimitException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginAttemptLimiterTest {

    @Test
    void limitsFailedAttemptsPerAddressAndResetsAfterSuccessOrWindowExpiry() {
        AdjustableClock clock = new AdjustableClock(Instant.parse("2026-10-15T12:00:00Z"));
        LoginAttemptLimiter limiter = new LoginAttemptLimiter(clock);

        for (int attempt = 0; attempt < 10; attempt++) {
            limiter.checkAllowed("192.0.2.1");
            limiter.recordFailure("192.0.2.1");
        }
        assertThrows(LoginRateLimitException.class, () -> limiter.checkAllowed("192.0.2.1"));
        assertDoesNotThrow(() -> limiter.checkAllowed("192.0.2.2"));

        limiter.recordSuccess("192.0.2.1");
        assertDoesNotThrow(() -> limiter.checkAllowed("192.0.2.1"));

        for (int attempt = 0; attempt < 10; attempt++) {
            limiter.recordFailure("192.0.2.1");
        }
        clock.advanceSeconds(15 * 60);
        assertDoesNotThrow(() -> limiter.checkAllowed("192.0.2.1"));
    }

    private static final class AdjustableClock extends Clock {
        private final AtomicReference<Instant> instant;

        private AdjustableClock(Instant instant) {
            this.instant = new AtomicReference<>(instant);
        }

        private void advanceSeconds(long seconds) {
            instant.updateAndGet(current -> current.plusSeconds(seconds));
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
