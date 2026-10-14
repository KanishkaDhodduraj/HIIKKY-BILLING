package com.hiikky.admin.service;

import com.hiikky.admin.dto.AdminAccountResponse;
import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import com.hiikky.admin.repository.AdminAccountRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAccountService {

    private final AdminAccountRepository adminAccountRepository;

    public AdminAccountService(AdminAccountRepository adminAccountRepository) {
        this.adminAccountRepository = adminAccountRepository;
    }

    /**
     * Retrieve a paginated list of admin accounts with optional filters.
     *
     * @param page zero‑based page index
     * @param size page size (max 100 enforced by caller)
     * @param enabled optional enabled flag filter
     * @param role optional role filter (ADMIN or SUPER_ADMIN)
     * @return list of DTOs
     */
    public List<AdminAccountResponse> listAdminAccounts(int page, int size, Boolean enabled, AdminRole role) {
        int offset = page * size;
        List<AdminAccount> accounts = adminAccountRepository.findAll(offset, size, enabled, role);
        return accounts.stream()
                .map(a -> new AdminAccountResponse(
                        a.getId(),
                        a.getEmail(),
                        a.getRole(),
                        a.isEnabled(),
                        a.getCreatedAt(),
                        a.getUpdatedAt()))
                .collect(Collectors.toList());
    }
}
