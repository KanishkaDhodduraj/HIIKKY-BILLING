package com.hiikky.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BusinessRequestSubmission(
        @NotBlank @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String ownerEmail,
        @Size(max = 50) @Pattern(regexp = "[+0-9() .-]*") String ownerPhone,
        @NotBlank @Size(max = 255) String organizationName,
        @NotBlank @Email @Size(max = 255) String organizationEmail,
        @Size(max = 50) @Pattern(regexp = "[+0-9() .-]*") String organizationPhone,
        @Size(max = 255) String organizationAddress) {
}
