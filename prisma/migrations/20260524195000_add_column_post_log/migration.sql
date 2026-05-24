-- CreateTable
CREATE TABLE "column_post_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "posted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "column_post_logs_posted_at_idx" ON "column_post_logs"("posted_at");
