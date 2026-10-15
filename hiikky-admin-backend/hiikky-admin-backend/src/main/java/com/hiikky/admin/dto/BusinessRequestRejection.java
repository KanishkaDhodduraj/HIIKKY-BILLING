package com.hiikky.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BusinessRequestRejection(
        @NotBlank @Size(max = 1000) String reason) {
}
