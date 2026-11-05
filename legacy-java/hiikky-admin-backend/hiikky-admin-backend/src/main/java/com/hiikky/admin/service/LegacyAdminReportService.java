package com.hiikky.admin.service;

import com.hiikky.admin.exception.ReportExportLimitException;
import com.hiikky.admin.model.LegacyReportFilters;
import com.hiikky.admin.model.LegacyReportKind;
import com.hiikky.admin.repository.JdbcLegacyReportRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class LegacyAdminReportService {

    private static final int EXPORT_QUERY_LIMIT = AdminReportService.MAX_EXPORT_ROWS + 1;

    private final JdbcLegacyReportRepository reportRepository;

    public LegacyAdminReportService(JdbcLegacyReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public List<Map<String, Object>> list(
            LegacyReportKind kind, LegacyReportFilters filters, int page, int size) {
        int offset;
        try {
            offset = Math.multiplyExact(page, size);
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Page index is too large", exception);
        }
        return reportRepository.find(kind, filters, size, offset);
    }

    public long count(LegacyReportKind kind, LegacyReportFilters filters) {
        return reportRepository.count(kind, filters);
    }

    public List<Map<String, Object>> export(LegacyReportKind kind, LegacyReportFilters filters) {
        List<Map<String, Object>> rows =
                reportRepository.find(kind, filters, EXPORT_QUERY_LIMIT, 0);
        if (rows.size() > AdminReportService.MAX_EXPORT_ROWS) {
            throw new ReportExportLimitException(
                    "CSV exports are limited to " + AdminReportService.MAX_EXPORT_ROWS
                            + " rows; narrow the report filters");
        }
        return rows;
    }
}
