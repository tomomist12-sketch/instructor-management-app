-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_instructors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "line_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_instructors" ("created_at", "email", "id", "line_id", "name") SELECT "created_at", "email", "id", "line_id", "name" FROM "instructors";
DROP TABLE "instructors";
ALTER TABLE "new_instructors" RENAME TO "instructors";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
