package com.hiikky.admin.security;

import com.hiikky.admin.exception.LoginRateLimitException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class LoginAttemptLimiter {

    private static final int MAX_FAILED_ATTEMPTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int CLEANUP_INTERVAL = 64;
    private static final int MAX_TRACKED_ADDRESSES = 10_000;

    private final Clock clock;
    private final Map<String, AttemptWindow> attemptsByAddress = new LinkedHashMap<>(16, 0.75f, true);
    private int failuresSinceCleanup;

    public LoginAttemptLimiter() {
        this(Clock.systemUTC());
    }

    LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized void checkAllowed(String remoteAddress) {
        AttemptWindow window = attemptsByAddress.get(remoteAddress);
        if (window == null) {
            return;
        }
        if (isExpired(window)) {
            attemptsByAddress.remove(remoteAddress);
            return;
        }
        if (window.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new LoginRateLimitException("Too many failed login attempts. Please try again later.");
        }
    }

    public synchronized void recordFailure(String remoteAddress) {
        long now = clock.millis();
        AttemptWindow window = attemptsByAddress.get(remoteAddress);
        if (window == null || isExpired(window)) {
            if (window != null) {
                attemptsByAddress.remove(remoteAddress);
            }
            if (attemptsByAddress.size() >= MAX_TRACKED_ADDRESSES) {
                evictOldestAddress();
            }
            window = new AttemptWindow(now);
            attemptsByAddress.put(remoteAddress, window);
        }
        window.failedAttempts++;
        failuresSinceCleanup++;
        if (failuresSinceCleanup >= CLEANUP_INTERVAL) {
            attemptsByAddress.entrySet().removeIf(entry -> isExpired(entry.getValue()));
            failuresSinceCleanup = 0;
        }
    }

    public synchronized void recordSuccess(String remoteAddress) {
        attemptsByAddress.remove(remoteAddress);
    }

    private boolean isExpired(AttemptWindow window) {
        return clock.millis() - window.startedAtMillis >= WINDOW.toMillis();
    }

    private void evictOldestAddress() {
        Iterator<String> addresses = attemptsByAddress.keySet().iterator();
        if (addresses.hasNext()) {
            addresses.next();
            addresses.remove();
        }
    }

    private static final class AttemptWindow {
        private final long startedAtMillis;
        private int failedAttempts;

        private AttemptWindow(long startedAtMillis) {
            this.startedAtMillis = startedAtMillis;
        }
    }
}
