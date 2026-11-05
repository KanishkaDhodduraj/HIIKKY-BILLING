package com.hiikky.admin.repository;

import com.hiikky.admin.dto.BusinessOwnerReportRow;
import com.hiikky.admin.dto.OrganizationReportRow;
import com.hiikky.admin.model.BusinessOwnerReportCriteria;
import com.hiikky.admin.model.OrganizationReportCriteria;

import java.util.List;

public interface AdminReportRepository {

    List<BusinessOwnerReportRow> findBusinessOwners(
            BusinessOwnerReportCriteria criteria, int limit, int offset);

    long countBusinessOwners(BusinessOwnerReportCriteria criteria);

    List<OrganizationReportRow> findOrganizations(
            OrganizationReportCriteria criteria, int limit, int offset);

    long countOrganizations(OrganizationReportCriteria criteria);
}
