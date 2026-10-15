package com.hiikky.admin.dto;

public class CsrfTokenResponse {

    private String token;
    private String headerName;
    private String parameterName;

    public CsrfTokenResponse() {
    }

    public CsrfTokenResponse(String token, String headerName, String parameterName) {
        this.token = token;
        this.headerName = headerName;
        this.parameterName = parameterName;
    }

    public String getToken() {
        return token;
    }

    public String getHeaderName() {
        return headerName;
    }

    public String getParameterName() {
        return parameterName;
    }
}
