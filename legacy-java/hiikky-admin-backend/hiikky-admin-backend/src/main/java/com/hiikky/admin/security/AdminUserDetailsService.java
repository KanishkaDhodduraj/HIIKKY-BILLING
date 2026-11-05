package com.hiikky.admin.security;

import com.hiikky.admin.model.AdminAccount;
import com.hiikky.admin.repository.AdminAccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminAccountRepository adminAccountRepository;

    public AdminUserDetailsService(AdminAccountRepository adminAccountRepository) {
        this.adminAccountRepository = adminAccountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AdminAccount account = adminAccountRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
        if (!account.isEnabled()) {
            throw new org.springframework.security.authentication.DisabledException("Account is disabled");
        }
        return new AdminPrincipal(account);
    }
}
