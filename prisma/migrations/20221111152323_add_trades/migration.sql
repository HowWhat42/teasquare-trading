-- CreateTable
CREATE TABLE `trades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pair` VARCHAR(255) NOT NULL,
    `leverage` INTEGER NOT NULL,
    `size` FLOAT NOT NULL,
    `entryPrice` FLOAT NOT NULL,
    `side` VARCHAR(191) NOT NULL,
    `closingPrice` FLOAT NOT NULL,
    `open` BOOLEAN NOT NULL DEFAULT true,
    `percent` FLOAT NULL,
    `win` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `credentialId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trades` ADD CONSTRAINT `trades_ibfk_1` FOREIGN KEY (`credentialId`) REFERENCES `credentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
