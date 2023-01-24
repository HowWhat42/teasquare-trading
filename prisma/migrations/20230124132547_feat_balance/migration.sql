/*
  Warnings:

  - Made the column `symbol` on table `positions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `leverage` on table `positions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `size` on table `positions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `entryPrice` on table `positions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `long` on table `positions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `open` on table `positions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `credentials` ADD COLUMN `balance` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `positions` MODIFY `symbol` VARCHAR(255) NOT NULL,
    MODIFY `leverage` INTEGER NOT NULL,
    MODIFY `size` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `entryPrice` FLOAT NOT NULL,
    MODIFY `long` BOOLEAN NOT NULL,
    MODIFY `open` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `traders` MODIFY `marginMode` VARCHAR(191) NOT NULL DEFAULT 'isolated';
