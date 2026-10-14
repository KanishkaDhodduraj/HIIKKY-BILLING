package com.hiikky.admin.service;

import com.hiikky.admin.dto.AdminAccountResponse;
import com.hiikky.admin.dto.CreateAdminAccountRequest;
import com.hiikky.admin.dto.UpdateAdminAccountRequest;
import com.hiikky.admin.exception.DuplicateResourceException;
import com.hiikky.admin.exception.ResourceNotFoundException;
import com.hiikky.admin.exception.SuperAdminProtectionException;
import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.repository.AdminAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAccountService {

    private final AdminAccountRepository adminAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountService(AdminAccountRepository adminAccountRepository,
                               PasswordEncoder passwordEncoder) {
        this.adminAccountRepository = adminAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Retrieve a paginated list of admin accounts with optional filters and search.
     *
     * @param page zero‑based page index
     * @param size page size (max 100 enforced by caller)
     * @param enabled optional enabled flag filter
     * @param role optional role filter (ADMIN or SUPER_ADMIN)
     * @param search optional search keyword (email matching)
     * @return list of DTOs
     */
    public List<AdminAccountResponse> listAdminAccounts(int page, int size, Boolean enabled, AdminRole role, String search) {
        int offset = page * size;
        List<AdminAccount> accounts = adminAccountRepository.findAll(offset, size, enabled, role, search);
        return accounts.stream()
                .map(AdminAccountResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Backwards-compatible overload without search param.
     */
    public List<AdminAccountResponse> listAdminAccounts(int page, int size, Boolean enabled, AdminRole role) {
        return listAdminAccounts(page, size, enabled, role, null);
    }

    /**
     * Count admin accounts matching criteria.
     */
    public long countAdminAccounts(Boolean enabled, AdminRole role, String search) {
        return adminAccountRepository.countWithFilters(enabled, role, search);
    }

    /**
     * View account details by ID.
     */
    public AdminAccountResponse getAccountById(Long id) {
        AdminAccount account = adminAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin account not found with id: " + id));
        return AdminAccountResponse.from(account);
    }

    /**
     * Create a new admin account.
     */
    public AdminAccountResponse createAdminAccount(CreateAdminAccountRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (adminAccountRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("An admin account with email '" + email + "' already exists");
        }

        AdminAccount newAccount = new AdminAccount();
        newAccount.setEmail(email);
        newAccount.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newAccount.setRole(request.getRole());
        newAccount.setEnabled(true);

        AdminAccount saved = adminAccountRepository.save(newAccount);
        return AdminAccountResponse.from(saved);
    }

    /**
     * Update account details.
     */
    public AdminAccountResponse updateAdminAccount(Long id, UpdateAdminAccountRequest request) {
        AdminAccount existing = adminAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin account not found with id: " + id));

        // Email uniqueness check
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(existing.getEmail())) {
                if (adminAccountRepository.existsByEmailAndIdNot(newEmail, id)) {
                    throw new DuplicateResourceException("Email '" + newEmail + "' is already in use by another admin account");
                }
                existing.setEmail(newEmail);
            }
        }

        // Role management and protection
        if (request.getRole() != null && request.getRole() != existing.getRole()) {
            if (existing.getRole() == AdminRole.SUPER_ADMIN && existing.isEnabled()) {
                long activeSuperAdmins = adminAccountRepository.countActiveSuperAdmins();
                if (activeSuperAdmins <= 1) {
                    throw new SuperAdminProtectionException("Cannot change role of the last active SUPER_ADMIN account");
                }
            }
            existing.setRole(request.getRole());
        }

        // Status update and protection
        if (request.getEnabled() != null && request.getEnabled() != existing.isEnabled()) {
            if (existing.getRole() == AdminRole.SUPER_ADMIN && existing.isEnabled() && !request.getEnabled()) {
                long activeSuperAdmins = adminAccountRepository.countActiveSuperAdmins();
                if (activeSuperAdmins <= 1) {
                    throw new SuperAdminProtectionException("Cannot deactivate the last active SUPER_ADMIN account");
                }
            }
            existing.setEnabled(request.getEnabled());
        }

        // Password update if provided
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            existing.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        AdminAccount updated = adminAccountRepository.save(existing);
        return AdminAccountResponse.from(updated);
    }

    /**
     * Activate or deactivate an account.
     */
    public AdminAccountResponse setAccountStatus(Long id, boolean enabled) {
        AdminAccount existing = adminAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin account not found with id: " + id));

        if (!enabled && existing.getRole() == AdminRole.SUPER_ADMIN && existing.isEnabled()) {
            long activeSuperAdmins = adminAccountRepository.countActiveSuperAdmins();
            if (activeSuperAdmins <= 1) {
                throw new SuperAdminProtectionException("Cannot deactivate the last active SUPER_ADMIN account");
            }
        }

        existing.setEnabled(enabled);
        AdminAccount updated = adminAccountRepository.save(existing);
        return AdminAccountResponse.from(updated);
    }

    /**
     * Delete an admin account.
     */
    public void deleteAdminAccount(Long id) {
        AdminAccount existing = adminAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin account not found with id: " + id));

        if (existing.getRole() == AdminRole.SUPER_ADMIN && existing.isEnabled()) {
            long activeSuperAdmins = adminAccountRepository.countActiveSuperAdmins();
            if (activeSuperAdmins <= 1) {
                throw new SuperAdminProtectionException("Cannot delete the last active SUPER_ADMIN account");
            }
        }

        adminAccountRepository.deleteById(id);
    }
}
