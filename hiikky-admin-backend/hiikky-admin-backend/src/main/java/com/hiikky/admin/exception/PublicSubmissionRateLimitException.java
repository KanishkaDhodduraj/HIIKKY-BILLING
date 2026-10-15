package com.hiikky.admin.exception;

public class PublicSubmissionRateLimitException extends RuntimeException {

    public PublicSubmissionRateLimitException(String message) {
        super(message);
    }
}
