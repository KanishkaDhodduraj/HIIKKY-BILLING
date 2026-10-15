package com.hiikky.admin.security;

import com.hiikky.admin.exception.PublicSubmissionRateLimitException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class PublicSubmissionRateLimiter {

    private static final int MAX_SUBMISSIONS = 10;
    private static final int MAX_TRACKED_ADDRESSES = 10_000;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final Clock clock;
    private final Map<String, SubmissionWindow> windows = new LinkedHashMap<>(16, 0.75f, true);

    public PublicSubmissionRateLimiter() {
        this(Clock.systemUTC());
    }

    PublicSubmissionRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized void checkAndRecord(String remoteAddress) {
        long now = clock.millis();
        SubmissionWindow window = windows.get(remoteAddress);
        if (window == null || now - window.startedAtMillis >= WINDOW.toMillis()) {
            if (windows.size() >= MAX_TRACKED_ADDRESSES) {
                Iterator<String> oldest = windows.keySet().iterator();
                if (oldest.hasNext()) {
                    oldest.next();
                    oldest.remove();
                }
            }
            windows.put(remoteAddress, new SubmissionWindow(now));
            return;
        }
        if (window.submissions >= MAX_SUBMISSIONS) {
            throw new PublicSubmissionRateLimitException(
                    "Too many registration submissions. Please try again later.");
        }
        window.submissions++;
    }

    private static final class SubmissionWindow {
        private final long startedAtMillis;
        private int submissions = 1;

        private SubmissionWindow(long startedAtMillis) {
            this.startedAtMillis = startedAtMillis;
        }
    }
}
