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
     * Find an admin account by email.
     */
    Optional<AdminAccount> findByEmail(String email);

    /**
     * Save (insert or update) an admin account.
     */
    AdminAccount save(AdminAccount adminAccount);

    /**
     * Count total admin accounts.
     */
    long count();

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
}
