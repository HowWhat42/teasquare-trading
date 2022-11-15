/*
  Warnings:

  - Made the column `name` on table `account` required. This step will fail if there are existing NULL values in that column.
  - Made the column `api` on table `account` required. This step will fail if there are existing NULL values in that column.
  - Made the column `secret` on table `account` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `account` MODIFY `name` VARCHAR(255) NOT NULL,
    MODIFY `api` VARCHAR(255) NOT NULL,
    MODIFY `secret` VARCHAR(255) NOT NULL;
