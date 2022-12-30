-- AlterTable
ALTER TABLE `trades` ADD COLUMN `traderId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `trades` ADD CONSTRAINT `trades_ibfk_2` FOREIGN KEY (`traderId`) REFERENCES `traders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
