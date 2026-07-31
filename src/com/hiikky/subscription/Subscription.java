package com.hiikky.subscription;

public class Subscription {

        private int subscriptionId;
        private String planName;
        private String description;
        private int price;
        private String billingCycle;
        private int maxUsers ;
        private String status;

        public Subscription() {
        }

        public Subscription(
                int subscriptionId,
                String planName,
                String description,
                int price,
                String billingCycle,
                int maxUsers,
                String status
        ) {
            this.subscriptionId = subscriptionId;
            this.planName = planName;
            this.description = description;
            this.price = price;
            this.billingCycle = billingCycle;
            this.maxUsers = maxUsers;
            this.status = status;
        }

        public int getSubscriptionId() {
            return subscriptionId;
        }

        public void setSubscriptionId(int subscriptionId) {
            this.subscriptionId = subscriptionId;
        }

        public String getPlanName() {
            return planName;
        }

        public void setPlanName(String planName) {
            this.planName = planName;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription() {
            this.description = description;
        }

        public int getPrice() {
            return price;
        }

        public void setPrice(int price) {
            this.price = price;
        }

        public String getBillingCycle() {
            return billingCycle;
        }

        public void setBillingCycle(String billingCycle) {
            this.billingCycle = billingCycle;
        }

        public int getMaxUsers() {
            return maxUsers;
        }

        public void setMaxUsers(int maxUsers) {
            this.maxUsers = maxUsers;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }


        @Override

        public String toString(){
            return "Subscription Details : { " + ("Subscription ID : " + subscriptionId) + ("Plan Name : " + planName) + (" Description : " + description) + (" Price : " + price ) + ("Billing Cycle :" + billingCycle) + ("Maximum Users: " + maxUsers) + ("Status: " + status) + "}";
        }
    }