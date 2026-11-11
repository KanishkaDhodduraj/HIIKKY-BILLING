package com.hiikky.invoice;

import java.util.List;

public class InvoiceService {

    private final InvoiceDAO invoiceDAO;

    public InvoiceService() {
        invoiceDAO = new InvoiceDAO();
    }

    public List<Invoice> getPaidInvoices(
            int organizationId
    ) {

        return invoiceDAO.getPaidInvoices(
                organizationId
        );
    }

    public Invoice getPaidInvoice(
            int organizationId,
            int billingId
    ) {

        return invoiceDAO.getPaidInvoiceByBillingId(
                organizationId,
                billingId
        );
    }
}