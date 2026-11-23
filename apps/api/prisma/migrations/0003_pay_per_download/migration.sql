-- Pay-per-download: monthly plans, subscriptions and quotas are replaced by a
-- fixed price per generated document plus a short re-download window.

-- Orders now reference the form they unlock instead of a plan.
ALTER TABLE `payment_orders` DROP FOREIGN KEY `payment_orders_plan_id_fkey`;
ALTER TABLE `payment_orders` DROP COLUMN `plan_id`;
ALTER TABLE `payment_orders` ADD COLUMN `form_code` VARCHAR(50) NULL AFTER `user_id`;
ALTER TABLE `payment_orders` ADD COLUMN `access_expires_at` DATETIME(3) NULL;
CREATE INDEX `payment_orders_user_id_form_code_status_idx` ON `payment_orders`(`user_id`, `form_code`, `status`);

-- Drop the retired subscription model. Historical orders keep their amount and
-- status; their plan_id simply no longer has a referenced row.
DROP TABLE `user_usage_quotas`;
DROP TABLE `subscriptions`;
DROP TABLE `plans`;
