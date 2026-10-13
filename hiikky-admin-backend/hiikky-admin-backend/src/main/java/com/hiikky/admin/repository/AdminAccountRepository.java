package com.hiikky.admin.repository;

import com.hiikky.admin.model.AdminAccount;

import java.util.Optional;

public interface AdminAccountRepository {

    Optional<AdminAccount> findByEmail(String email);

    AdminAccount save(AdminAccount adminAccount);

    long count();
}
