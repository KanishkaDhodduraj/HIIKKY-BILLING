package com.hiikky.discount;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class DiscountCalculator {

    private static final BigDecimal ONE_HUNDRED =
            new BigDecimal("100");

    private DiscountCalculator() {
    }

    public static BigDecimal calculate(
            BigDecimal originalAmount,
            Discount discount
    ) {

        if (originalAmount == null ||
                originalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (discount == null ||
                discount.getDiscountValue() == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal discountAmount;

        if (discount.getDiscountType() ==
                DiscountType.PERCENTAGE) {

            discountAmount = originalAmount
                    .multiply(discount.getDiscountValue())
                    .divide(
                            ONE_HUNDRED,
                            2,
                            RoundingMode.HALF_UP
                    );

        } else {

            discountAmount =
                    discount.getDiscountValue();
        }

        // Never allow discount > original amount
        if (discountAmount.compareTo(originalAmount) > 0) {
            discountAmount = originalAmount;
        }

        return discountAmount.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    public static BigDecimal calculateFinalAmount(
            BigDecimal originalAmount,
            Discount discount
    ) {

        BigDecimal discountAmount =
                calculate(originalAmount, discount);

        return originalAmount
                .subtract(discountAmount)
                .max(BigDecimal.ZERO)
                .setScale(
                        2,
                        RoundingMode.HALF_UP
                );
    }
}