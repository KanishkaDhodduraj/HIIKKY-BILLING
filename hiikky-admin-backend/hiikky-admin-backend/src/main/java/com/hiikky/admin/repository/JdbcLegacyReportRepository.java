package com.hiikky.admin.repository;

import com.hiikky.admin.model.LegacyReportFilters;
import com.hiikky.admin.model.LegacyReportKind;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.Locale;

@Repository
public class JdbcLegacyReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public JdbcLegacyReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> find(
            LegacyReportKind kind, LegacyReportFilters filters, int limit, int offset) {
        QueryParts query = buildQuery(kind, filters);
        List<Object> parameters = new ArrayList<>(query.parameters());
        parameters.add(limit);
        parameters.add(offset);
        return jdbcTemplate.query(query.select() + query.whereClause()
                        + " ORDER BY " + sortColumn(kind, filters.sortBy()) + " "
                        + filters.sortDirection().name() + ", " + idColumn(kind)
                        + " ASC LIMIT ? OFFSET ?",
                (rs, rowNum) -> {
                    var metadata = rs.getMetaData();
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int index = 1; index <= metadata.getColumnCount(); index++) {
                        row.put(canonicalColumnLabel(metadata.getColumnLabel(index)), rs.getObject(index));
                    }
                    return row;
                }, parameters.toArray());
    }

    public long count(LegacyReportKind kind, LegacyReportFilters filters) {
        QueryParts query = buildQuery(kind, filters);
        Long count = jdbcTemplate.queryForObject(
                query.count() + query.whereClause(), Long.class, query.parameters().toArray());
        return count == null ? 0L : count;
    }

    private QueryParts buildQuery(LegacyReportKind kind, LegacyReportFilters filters) {
        String select;
        String count;
        String alias;
        switch (kind) {
            case SUBSCRIBERS -> {
                select = """
                        SELECT subscriber_id AS id, organization_id AS organizationId,
                               subscription_id AS subscriptionId, full_name AS fullName,
                               email, phone, start_date AS startDate, end_date AS endDate, status
                        FROM subscribers
                        """;
                count = "SELECT COUNT(*) FROM subscribers";
                alias = "";
            }
            case SUBSCRIPTIONS -> {
                select = """
                        SELECT subscription_id AS id, plan_name AS planName, description,
                               price, billing_cycle AS billingCycle, max_users AS maxUsers, status
                        FROM subscriptions
                        """;
                count = "SELECT COUNT(*) FROM subscriptions";
                alias = "";
            }
            case BILLING -> {
                select = """
                        SELECT billing_id AS id, organization_id AS organizationId,
                               subscriber_id AS subscriberId, subscription_id AS subscriptionId,
                               payment_name AS paymentName, due_date AS dueDate, amount,
                               payment_status AS paymentStatus, paid_date AS paidDate,
                               created_at AS createdAt, original_amount AS originalAmount,
                               discount_id AS discountId, discount_amount AS discountAmount
                        FROM billing
                        """;
                count = "SELECT COUNT(*) FROM billing";
                alias = "";
            }
            case COURSES -> {
                select = """
                        SELECT course_id AS id, course_code AS courseCode, course_name AS courseName,
                               duration, duration_unit AS durationUnit, course_fee AS courseFee,
                               payment_type AS paymentType, status, description, created_at AS createdAt
                        FROM courses
                        """;
                count = "SELECT COUNT(*) FROM courses";
                alias = "";
            }
            case COURSE_INSTALLMENTS -> {
                select = """
                        SELECT ci.installment_id AS id, ci.course_id AS courseId,
                               c.course_name AS courseName, ci.installment_number AS installmentNumber,
                               ci.installment_name AS installmentName, ci.amount,
                               ci.due_days AS dueDays, ci.due_date AS dueDate, ci.created_at AS createdAt
                        FROM course_installments ci
                        LEFT JOIN courses c ON c.course_id = ci.course_id
                        """;
                count = "SELECT COUNT(*) FROM course_installments ci "
                        + "LEFT JOIN courses c ON c.course_id = ci.course_id";
                alias = "ci.";
            }
            default -> throw new IllegalArgumentException("Unsupported report type");
        }
        StringJoiner conditions = new StringJoiner(" AND ");
        List<Object> parameters = new ArrayList<>();
        if (filters.organizationId() != null) {
            conditions.add("organization_id = ?");
            parameters.add(filters.organizationId());
        }
        if (filters.subscriberId() != null) {
            conditions.add("subscriber_id = ?");
            parameters.add(filters.subscriberId());
        }
        if (filters.subscriptionId() != null) {
            conditions.add("subscription_id = ?");
            parameters.add(filters.subscriptionId());
        }
        if (filters.courseId() != null) {
            conditions.add(alias + "course_id = ?");
            parameters.add(filters.courseId());
        }
        if (filters.status() != null) {
            conditions.add(alias + "status = ?");
            parameters.add(filters.status());
        }
        if (filters.paymentStatus() != null) {
            conditions.add("payment_status = ?");
            parameters.add(filters.paymentStatus());
        }
        if (filters.paymentType() != null) {
            conditions.add("payment_type = ?");
            parameters.add(filters.paymentType());
        }
        if (filters.search() != null && !filters.search().isBlank()) {
            String pattern = "%" + filters.search().trim().toLowerCase(java.util.Locale.ROOT) + "%";
            String search = switch (kind) {
                case SUBSCRIBERS -> "(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)";
                case SUBSCRIPTIONS -> "(LOWER(plan_name) LIKE ? OR LOWER(description) LIKE ?)";
                case BILLING -> "LOWER(payment_name) LIKE ?";
                case COURSES -> "(LOWER(course_code) LIKE ? OR LOWER(course_name) LIKE ?)";
                case COURSE_INSTALLMENTS ->
                        "(LOWER(ci.installment_name) LIKE ? OR LOWER(c.course_name) LIKE ?)";
            };
            conditions.add(search);
            int placeholders = (int) search.chars().filter(character -> character == '?').count();
            for (int index = 0; index < placeholders; index++) {
                parameters.add(pattern);
            }
        }
        if (filters.fromDate() != null) {
            String dateColumn = switch (kind) {
                case SUBSCRIBERS -> "start_date";
                case BILLING -> "due_date";
                case COURSES -> "created_at";
                case COURSE_INSTALLMENTS -> "ci.due_date";
                case SUBSCRIPTIONS -> throw new IllegalArgumentException(
                        "Date filtering is not supported for subscriptions");
            };
            conditions.add(dateColumn + " >= ?");
            parameters.add(kind == LegacyReportKind.COURSES
                    ? Timestamp.valueOf(filters.fromDate().atStartOfDay())
                    : Date.valueOf(filters.fromDate()));
            conditions.add(dateColumn + (kind == LegacyReportKind.COURSES ? " < ?" : " <= ?"));
            parameters.add(kind == LegacyReportKind.COURSES
                    ? Timestamp.valueOf(filters.toDate().plusDays(1).atStartOfDay())
                    : Date.valueOf(filters.toDate()));
        }
        return new QueryParts(select, count,
                conditions.length() == 0 ? "" : " WHERE " + conditions, parameters);
    }

    private String idColumn(LegacyReportKind kind) {
        return switch (kind) {
            case SUBSCRIBERS -> "subscriber_id";
            case SUBSCRIPTIONS -> "subscription_id";
            case BILLING -> "billing_id";
            case COURSES -> "course_id";
            case COURSE_INSTALLMENTS -> "ci.installment_id";
        };
    }

    private String canonicalColumnLabel(String label) {
        return switch (label.toLowerCase(Locale.ROOT)) {
            case "organizationid" -> "organizationId";
            case "subscriberid" -> "subscriberId";
            case "subscriptionid" -> "subscriptionId";
            case "fullname" -> "fullName";
            case "startdate" -> "startDate";
            case "enddate" -> "endDate";
            case "planname" -> "planName";
            case "billingcycle" -> "billingCycle";
            case "maxusers" -> "maxUsers";
            case "paymentname" -> "paymentName";
            case "duedate" -> "dueDate";
            case "paymentstatus" -> "paymentStatus";
            case "paiddate" -> "paidDate";
            case "createdat" -> "createdAt";
            case "originalamount" -> "originalAmount";
            case "discountid" -> "discountId";
            case "discountamount" -> "discountAmount";
            case "coursecode" -> "courseCode";
            case "coursename" -> "courseName";
            case "durationunit" -> "durationUnit";
            case "coursefee" -> "courseFee";
            case "paymenttype" -> "paymentType";
            case "courseid" -> "courseId";
            case "installmentnumber" -> "installmentNumber";
            case "installmentname" -> "installmentName";
            case "duedays" -> "dueDays";
            default -> label.toLowerCase(Locale.ROOT);
        };
    }

    private String sortColumn(LegacyReportKind kind, String sortBy) {
        return switch (kind) {
            case SUBSCRIBERS -> switch (sortBy) {
                case "id" -> "subscriber_id";
                case "fullName" -> "full_name";
                case "email" -> "email";
                case "startDate" -> "start_date";
                case "endDate" -> "end_date";
                case "status" -> "status";
                default -> throw new IllegalArgumentException("Unsupported subscriber report sort field");
            };
            case SUBSCRIPTIONS -> switch (sortBy) {
                case "id" -> "subscription_id";
                case "planName" -> "plan_name";
                case "price" -> "price";
                case "billingCycle" -> "billing_cycle";
                case "maxUsers" -> "max_users";
                case "status" -> "status";
                default -> throw new IllegalArgumentException("Unsupported subscription report sort field");
            };
            case BILLING -> switch (sortBy) {
                case "id" -> "billing_id";
                case "organizationId" -> "organization_id";
                case "subscriberId" -> "subscriber_id";
                case "dueDate" -> "due_date";
                case "amount" -> "amount";
                case "paymentStatus" -> "payment_status";
                case "paidDate" -> "paid_date";
                case "createdAt" -> "created_at";
                default -> throw new IllegalArgumentException("Unsupported billing report sort field");
            };
            case COURSES -> switch (sortBy) {
                case "id" -> "course_id";
                case "courseCode" -> "course_code";
                case "courseName" -> "course_name";
                case "courseFee" -> "course_fee";
                case "paymentType" -> "payment_type";
                case "status" -> "status";
                case "createdAt" -> "created_at";
                default -> throw new IllegalArgumentException("Unsupported course report sort field");
            };
            case COURSE_INSTALLMENTS -> switch (sortBy) {
                case "id" -> "ci.installment_id";
                case "courseId" -> "ci.course_id";
                case "courseName" -> "c.course_name";
                case "installmentNumber" -> "ci.installment_number";
                case "installmentName" -> "ci.installment_name";
                case "amount" -> "ci.amount";
                case "dueDate" -> "ci.due_date";
                default -> throw new IllegalArgumentException("Unsupported installment report sort field");
            };
        };
    }

    private record QueryParts(String select, String count, String whereClause, List<Object> parameters) {
    }
}
