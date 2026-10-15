package com.hiikky.admin.service;

import com.hiikky.admin.dto.BusinessOwnerReportRow;
import com.hiikky.admin.dto.OrganizationReportRow;
import com.hiikky.admin.exception.ReportExportLimitException;
import com.hiikky.admin.model.BusinessOwnerReportCriteria;
import com.hiikky.admin.model.OrganizationReportCriteria;
import com.hiikky.admin.repository.AdminReportRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminReportService {

    public static final int MAX_EXPORT_ROWS = 10_000;
    private static final int EXPORT_QUERY_LIMIT = MAX_EXPORT_ROWS + 1;

    private final AdminReportRepository reportRepository;

    public AdminReportService(AdminReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public List<BusinessOwnerReportRow> listBusinessOwners(BusinessOwnerReportCriteria criteria) {
        return reportRepository.findBusinessOwners(criteria, criteria.size(), criteria.page() * criteria.size());
    }

    public long countBusinessOwners(BusinessOwnerReportCriteria criteria) {
        return reportRepository.countBusinessOwners(criteria);
    }

    public List<OrganizationReportRow> listOrganizations(OrganizationReportCriteria criteria) {
        return reportRepository.findOrganizations(criteria, criteria.size(), criteria.page() * criteria.size());
    }

    public long countOrganizations(OrganizationReportCriteria criteria) {
        return reportRepository.countOrganizations(criteria);
    }

    public List<BusinessOwnerReportRow> exportBusinessOwners(BusinessOwnerReportCriteria criteria) {
        List<BusinessOwnerReportRow> rows =
                reportRepository.findBusinessOwners(criteria, EXPORT_QUERY_LIMIT, 0);
        ensureExportWithinLimit(rows.size());
        return rows;
    }

    public List<OrganizationReportRow> exportOrganizations(OrganizationReportCriteria criteria) {
        List<OrganizationReportRow> rows =
                reportRepository.findOrganizations(criteria, EXPORT_QUERY_LIMIT, 0);
        ensureExportWithinLimit(rows.size());
        return rows;
    }

    private void ensureExportWithinLimit(int rowCount) {
        if (rowCount > MAX_EXPORT_ROWS) {
            throw new ReportExportLimitException(
                    "CSV exports are limited to " + MAX_EXPORT_ROWS + " rows; narrow the report filters");
        }
    }
}
