package com.hiikky.billing;

import com.hiikky.organization.Organization;
import com.hiikky.organization.OrganizationService;

import java.math.BigDecimal;
import java.util.List;

public class BillingService {

    private final BillingDAO billingDAO;
    private final BillingNotificationDAO notificationDAO;
    private final OrganizationService organizationService;

    public BillingService() {
        billingDAO = new BillingDAO();
        notificationDAO = new BillingNotificationDAO();
        organizationService = new OrganizationService();
    }

    public boolean createBilling(Billing billing) {

        if (!isValidOrganization(billing.getOrganizationId())) {
            return false;
        }

        if (!validateBilling(billing)) {
            return false;
        }

        return billingDAO.saveBilling(billing);
    }

    public List<Billing> getBilling(int organizationId) {

        if (!isValidOrganization(organizationId)) {
            return List.of();
        }

        return billingDAO.getAllBilling(organizationId);
    }

    public List<Billing> searchBilling(
            int organizationId,
            String keyword,
            BillingStatus status
    ) {

        if (!isValidOrganization(organizationId)) {
            return List.of();
        }

        return billingDAO.searchBilling(
                organizationId,
                keyword,
                status
        );
    }

    public boolean markAsPaid(
            int organizationId,
            int billingId
    ) {

        if (!isValidOrganization(organizationId)) {
            return false;
        }

        return billingDAO.markAsPaid(
                organizationId,
                billingId
        );
    }

    public Billing getBillingById(
            int organizationId,
            int billingId
    ) {

        if (!isValidOrganization(organizationId)) {
            return null;
        }

        return billingDAO.getBillingById(
                organizationId,
                billingId
        );
    }

    public boolean sendNotification(
            int organizationId,
            int billingId,
            String message
    ) {

        Billing billing = getBillingById(
                organizationId,
                billingId
        );

        if (billing == null) {
            System.out.println("Billing record not found.");
            return false;
        }

        if (billing.getStatus() == BillingStatus.PAID) {
            System.out.println(
                    "Notification is not required for paid payment."
            );
            return false;
        }

        if (message == null || message.isBlank()) {
            System.out.println("Notification message is required.");
            return false;
        }

        return notificationDAO.saveNotification(
                billing,
                message.trim()
        );
    }

    public BigDecimal getPaidTotal(int organizationId) {
        return billingDAO.getTotalByStatus(
                organizationId,
                BillingStatus.PAID
        );
    }

    public BigDecimal getUnpaidTotal(int organizationId) {
        return billingDAO.getTotalByStatus(
                organizationId,
                BillingStatus.UNPAID
        );
    }

    public BigDecimal getOverdueTotal(int organizationId) {
        return billingDAO.getTotalByStatus(
                organizationId,
                BillingStatus.OVERDUE
        );
    }

    private boolean isValidOrganization(int organizationId) {

        if (organizationId <= 0) {
            System.out.println("Invalid organization ID.");
            return false;
        }

        Organization organization =
                organizationService.searchOrganizationById(
                        organizationId
                );

        if (organization == null) {
            System.out.println("Organization not found.");
            return false;
        }

        return true;
    }

    private boolean validateBilling(Billing billing) {

        if (billing.getSubscriberId() <= 0) {
            System.out.println("Invalid subscriber ID.");
            return false;
        }

        if (billing.getSubscriptionId() <= 0) {
            System.out.println("Invalid subscription ID.");
            return false;
        }

        if (billing.getPaymentName() == null ||
                billing.getPaymentName().isBlank()) {

            System.out.println("Payment name is required.");
            return false;
        }

        if (billing.getDueDate() == null) {
            System.out.println("Due date is required.");
            return false;
        }

        if (billing.getAmount() == null ||
                billing.getAmount().compareTo(BigDecimal.ZERO) <= 0) {

            System.out.println("Amount must be greater than zero.");
            return false;
        }

        return true;
    }
}