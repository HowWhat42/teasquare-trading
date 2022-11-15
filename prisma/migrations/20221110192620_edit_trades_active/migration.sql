/*
  Warnings:

  - You are about to drop the column `active` on the `traders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `traders` DROP COLUMN `active`,
    ADD COLUMN `bybit` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `telegram` BOOLEAN NOT NULL DEFAULT false;
