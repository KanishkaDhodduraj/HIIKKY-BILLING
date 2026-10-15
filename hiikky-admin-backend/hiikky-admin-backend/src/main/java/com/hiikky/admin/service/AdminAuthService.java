package com.hiikky.admin.service;

import com.hiikky.admin.dto.AdminResponse;
import com.hiikky.admin.dto.LoginRequest;
import com.hiikky.admin.dto.UpdateAdminProfileRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.repository.AdminAccountRepository;
import com.hiikky.admin.security.AdminPrincipal;
import com.hiikky.admin.security.LoginAttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AdminAuthService {

    private final AuthenticationManager authenticationManager;
    private final AdminAccountRepository adminAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextRepository securityContextRepository;
    private final CsrfTokenRepository csrfTokenRepository;
    private final LoginAttemptLimiter loginAttemptLimiter;

    public AdminAuthService(AuthenticationManager authenticationManager,
                            AdminAccountRepository adminAccountRepository,
                            PasswordEncoder passwordEncoder,
                            SecurityContextRepository securityContextRepository,
                            CsrfTokenRepository csrfTokenRepository,
                            LoginAttemptLimiter loginAttemptLimiter) {
        this.authenticationManager = authenticationManager;
        this.adminAccountRepository = adminAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityContextRepository = securityContextRepository;
        this.csrfTokenRepository = csrfTokenRepository;
        this.loginAttemptLimiter = loginAttemptLimiter;
    }

    public AdminResponse login(LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        String remoteAddress = request.getRemoteAddr();
        loginAttemptLimiter.checkAllowed(remoteAddress);
        UsernamePasswordAuthenticationToken authRequest =
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword());

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(authRequest);
        } catch (AuthenticationException exception) {
            loginAttemptLimiter.recordFailure(remoteAddress);
            throw exception;
        }
        loginAttemptLimiter.recordSuccess(remoteAddress);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = request.getSession(false);
        if (session != null) {
            request.changeSessionId();
        } else {
            request.getSession(true);
        }
        csrfTokenRepository.saveToken(null, request, response);
        securityContextRepository.saveContext(context, request, response);

        AdminPrincipal principal = (AdminPrincipal) authentication.getPrincipal();
        AdminAccount account = adminAccountRepository.findByEmail(principal.getUsername())
                .orElseThrow();

        return new AdminResponse(account.getId(), account.getEmail(), account.getRole(), account.isEnabled());
    }

    public AdminResponse registerAdminIfAbsent(String email, String rawPassword, AdminRole role) {
        Optional<AdminAccount> existing = adminAccountRepository.findByEmail(email);
        if (existing.isPresent()) {
            AdminAccount account = existing.get();
            return new AdminResponse(account.getId(), account.getEmail(), account.getRole(), account.isEnabled());
        }

        AdminAccount newAccount = new AdminAccount();
        newAccount.setEmail(email);
        newAccount.setPasswordHash(passwordEncoder.encode(rawPassword));
        newAccount.setRole(role);
        newAccount.setEnabled(true);

        AdminAccount saved = adminAccountRepository.save(newAccount);
        return new AdminResponse(saved.getId(), saved.getEmail(), saved.getRole(), saved.isEnabled());
    }

    public AdminResponse getProfile(Long adminId) {
        AdminAccount account = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin account not found"));
        return toResponse(account);
    }

    public AdminResponse updateProfile(Long adminId, UpdateAdminProfileRequest request) {
        AdminAccount account = adminAccountRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin account not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }

        boolean emailChanged = request.getEmail() != null;
        boolean passwordChanged = request.getNewPassword() != null && !request.getNewPassword().isBlank();
        if (!emailChanged && !passwordChanged) {
            throw new IllegalArgumentException("Provide an email or new password to update");
        }
        if (emailChanged) {
            if (request.getEmail().isBlank()) {
                throw new IllegalArgumentException("Email must not be blank");
            }
            String email = request.getEmail().trim().toLowerCase();
            if (!email.equalsIgnoreCase(account.getEmail())) {
                if (adminAccountRepository.existsByEmail(email)) {
                    throw new DuplicateResourceException("Email is already in use by another admin account");
                }
                account.setEmail(email);
            }
        }
        if (passwordChanged) {
            account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }
        return toResponse(adminAccountRepository.save(account));
    }

    private AdminResponse toResponse(AdminAccount account) {
        return new AdminResponse(account.getId(), account.getEmail(), account.getRole(), account.isEnabled());
    }
}
