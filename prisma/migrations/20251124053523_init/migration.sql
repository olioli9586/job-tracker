-- CreateTable
CREATE TABLE "Application" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalId" BIGINT,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "fullDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextStageType" TEXT,
    "deadline" DATETIME,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "timestamps" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_date_key" ON "DailyEntry"("date");
