package com.hiikky.admin.model;

public enum BusinessOwnerSortField {
    ID("id"),
    FIRST_NAME("first_name"),
    LAST_NAME("last_name"),
    EMAIL("email"),
    STATUS("status"),
    CREATED_AT("created_at"),
    UPDATED_AT("updated_at");

    private final String column;

    BusinessOwnerSortField(String column) {
        this.column = column;
    }

    public String getColumn() {
        return column;
    }

    public static BusinessOwnerSortField fromParameter(String value) {
        return switch (value) {
            case "id" -> ID;
            case "firstName" -> FIRST_NAME;
            case "lastName" -> LAST_NAME;
            case "email" -> EMAIL;
            case "status" -> STATUS;
            case "createdAt" -> CREATED_AT;
            case "updatedAt" -> UPDATED_AT;
            default -> throw new IllegalArgumentException(
                    "sortBy must be one of id, firstName, lastName, email, status, createdAt, updatedAt");
        };
    }
}
