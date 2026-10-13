package com.hiikky.admin.service;

import com.hiikky.admin.dto.AdminResponse;
import com.hiikky.admin.dto.LoginRequest;
import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.repository.AdminAccountRepository;
import com.hiikky.admin.security.AdminPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AdminAuthService {

    private final AuthenticationManager authenticationManager;
    private final AdminAccountRepository adminAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAuthService(AuthenticationManager authenticationManager,
                            AdminAccountRepository adminAccountRepository,
                            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.adminAccountRepository = adminAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AdminResponse login(LoginRequest loginRequest, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authRequest =
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword());

        Authentication authentication = authenticationManager.authenticate(authRequest);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = request.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

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
}
