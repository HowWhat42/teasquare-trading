/*
  Warnings:

  - You are about to drop the column `bankrollPercentage` on the `credentials` table. All the data in the column will be lost.
  - You are about to drop the column `maxLeverage` on the `credentials` table. All the data in the column will be lost.
  - Made the column `name` on table `traders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `url` on table `traders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `credentials` DROP COLUMN `bankrollPercentage`,
    DROP COLUMN `maxLeverage`;

-- AlterTable
ALTER TABLE `traders` ADD COLUMN `bankrollPercentage` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `marginMode` VARCHAR(191) NOT NULL DEFAULT 'same',
    ADD COLUMN `maxLeverage` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `minLeverage` INTEGER NOT NULL DEFAULT 1,
    MODIFY `name` VARCHAR(255) NOT NULL,
    MODIFY `url` VARCHAR(255) NOT NULL;
