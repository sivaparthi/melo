/*
  Warnings:

  - A unique constraint covering the columns `[directKey]` on the table `LiveSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LiveSessionKind" AS ENUM ('direct', 'group');

-- AlterTable
ALTER TABLE "LiveSession" ADD COLUMN     "directKey" TEXT,
ADD COLUMN     "kind" "LiveSessionKind" NOT NULL DEFAULT 'group';

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_directKey_key" ON "LiveSession"("directKey");
