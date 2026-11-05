package com.hiikky.admin.security;

import com.hiikky.admin.exception.PublicSubmissionRateLimitException;
import com.hiikky.admin.model.PublicRegistrationRateLimitSetting;
import com.hiikky.admin.repository.AdminSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class PublicSubmissionRateLimiter {

    public static final int DEFAULT_MAX_SUBMISSIONS =
            PublicRegistrationRateLimitSetting.DEFAULT_MAX_SUBMISSIONS;
    public static final int MIN_MAX_SUBMISSIONS = PublicRegistrationRateLimitSetting.MIN_MAX_SUBMISSIONS;
    public static final int MAX_MAX_SUBMISSIONS = PublicRegistrationRateLimitSetting.MAX_MAX_SUBMISSIONS;
    public static final int WINDOW_MINUTES = PublicRegistrationRateLimitSetting.WINDOW_MINUTES;
    private static final int MAX_TRACKED_ADDRESSES = 10_000;
    private static final Duration WINDOW = Duration.ofMinutes(WINDOW_MINUTES);

    private final AdminSettingRepository settingRepository;
    private final Clock clock;
    private final Map<String, SubmissionWindow> windows = new LinkedHashMap<>(16, 0.75f, true);

    @Autowired
    public PublicSubmissionRateLimiter(AdminSettingRepository settingRepository) {
        this(settingRepository, Clock.systemUTC());
    }

    PublicSubmissionRateLimiter(AdminSettingRepository settingRepository, Clock clock) {
        this.settingRepository = settingRepository;
        this.clock = clock;
    }

    public void checkAndRecord(String remoteAddress) {
        int maxSubmissions = settingRepository.getPublicRegistrationMaxSubmissions();
        long now = clock.millis();
        synchronized (this) {
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
            if (window.submissions >= maxSubmissions) {
                throw new PublicSubmissionRateLimitException(
                        "Too many registration submissions. Please try again later.");
            }
            window.submissions++;
        }
    }

    private static final class SubmissionWindow {
        private final long startedAtMillis;
        private int submissions = 1;

        private SubmissionWindow(long startedAtMillis) {
            this.startedAtMillis = startedAtMillis;
        }
    }
}
