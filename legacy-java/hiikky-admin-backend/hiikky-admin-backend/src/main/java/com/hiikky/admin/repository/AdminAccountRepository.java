package com.hiikky.admin.repository;

import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.model.AdminRole;
import java.util.Optional;
import java.util.List;

/**
 * Repository for admin accounts.
 */
public interface AdminAccountRepository {

    /**
     * Find an admin account by id.
     */
    Optional<AdminAccount> findById(Long id);

    /**
     * Find an admin account by email.
     */
    Optional<AdminAccount> findByEmail(String email);

    /**
     * Check if an admin account with given email exists.
     */
    boolean existsByEmail(String email);

    /**
     * Check if an admin account with given email exists excluding a specific id.
     */
    boolean existsByEmailAndIdNot(String email, Long id);

    /**
     * Save (insert or update) an admin account.
     */
    AdminAccount save(AdminAccount adminAccount);

    /**
     * Delete an admin account by id.
     */
    boolean deleteById(Long id);

    /**
     * Count total admin accounts.
     */
    long count();

    /**
     * Count active SUPER_ADMIN accounts.
     */
    long countActiveSuperAdmins();

    /**
     * Count admin accounts matching filters.
     */
    long countWithFilters(Boolean enabled, AdminRole role, String search);

    /**
     * Find admin accounts with optional filters and pagination.
     *
     * @param offset zero‑based offset for pagination
     * @param limit maximum number of rows returned (capped by caller)
     * @param enabled optional filter on enabled flag (null = ignore)
     * @param role optional filter on role (null = ignore)
     * @return a list of matching admin accounts
     */
    List<AdminAccount> findAll(int offset, int limit, Boolean enabled, AdminRole role);

    /**
     * Find admin accounts with optional filters, search, and pagination.
     *
     * @param offset zero‑based offset for pagination
     * @param limit maximum number of rows returned (capped by caller)
     * @param enabled optional filter on enabled flag (null = ignore)
     * @param role optional filter on role (null = ignore)
     * @param search optional search keyword (email matching)
     * @return a list of matching admin accounts
     */
    List<AdminAccount> findAll(int offset, int limit, Boolean enabled, AdminRole role, String search);
}
