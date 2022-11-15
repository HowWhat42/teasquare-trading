-- AlterTable
ALTER TABLE `credentials` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `nc_evolutions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `titleDown` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `batch` INTEGER NULL,
    `checksum` VARCHAR(255) NULL,
    `status` INTEGER NULL,
    `created` DATETIME(0) NULL,
    `created_at` DATETIME(0) NULL,
    `updated_at` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
