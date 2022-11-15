-- CreateTable
CREATE TABLE `positions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(255) NULL,
    `leverage` INTEGER NULL,
    `size` FLOAT NULL,
    `entryPrice` FLOAT NULL,
    `long` BOOLEAN NULL,
    `closingPrice` FLOAT NULL,
    `open` BOOLEAN NULL,
    `openTime` DATETIME(0) NULL,
    `percent` FLOAT NULL,
    `win` BOOLEAN NULL,
    `createdAt` DATETIME(0) NOT NULL,
    `updatedAt` DATETIME(0) NOT NULL,
    `traderId` INTEGER NULL,

    INDEX `traderId`(`traderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `traders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `url` VARCHAR(255) NULL,
    `active` BOOLEAN NULL,
    `createdAt` DATETIME(0) NOT NULL,
    `updatedAt` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `api` VARCHAR(255) NULL,
    `secret` VARCHAR(255) NULL,
    `createdAt` DATETIME(0) NOT NULL,
    `updatedAt` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_ibfk_1` FOREIGN KEY (`traderId`) REFERENCES `traders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
