package com.hiikky.discount;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class DiscountService {

    private final DiscountDAO discountDAO;

    public DiscountService() {
        discountDAO = new DiscountDAO();
    }

    public boolean createDiscount(
            Discount discount
    ) {

        if (!validate(discount)) {
            return false;
        }

        return discountDAO.save(discount);
    }

    public List<Discount> getDiscounts(
            int organizationId
    ) {

        return discountDAO.findAll(
                organizationId
        );
    }

    public Discount findApplicableDiscount(
            int organizationId,
            Integer courseId,
            Integer subscriberId,
            LocalDate date
    ) {

        return discountDAO.findApplicableDiscount(
                organizationId,
                courseId,
                subscriberId,
                date
        );
    }

    public boolean deactivateDiscount(
            int organizationId,
            int discountId
    ) {

        return discountDAO.deactivate(
                organizationId,
                discountId
        );
    }

    private boolean validate(
            Discount discount
    ) {

        if (discount == null) {
            return false;
        }

        if (discount.getDiscountName() == null ||
                discount.getDiscountName().isBlank()) {

            System.out.println(
                    "Discount name is required."
            );

            return false;
        }

        if (discount.getDiscountType() == null) {

            System.out.println(
                    "Discount type is required."
            );

            return false;
        }

        BigDecimal value =
                discount.getDiscountValue();

        if (value == null ||
                value.compareTo(BigDecimal.ZERO) <= 0) {

            System.out.println(
                    "Discount value must be greater than zero."
            );

            return false;
        }

        if (discount.getDiscountType()
                == DiscountType.PERCENTAGE
                &&
                value.compareTo(
                        new BigDecimal("100")
                ) > 0) {

            System.out.println(
                    "Percentage cannot exceed 100%."
            );

            return false;
        }

        if (discount.getStartDate() == null ||
                discount.getEndDate() == null) {

            System.out.println(
                    "Start and end dates are required."
            );

            return false;
        }

        if (discount.getEndDate()
                .isBefore(
                        discount.getStartDate()
                )) {

            System.out.println(
                    "End date cannot be before start date."
            );

            return false;
        }

        return true;
    }
}