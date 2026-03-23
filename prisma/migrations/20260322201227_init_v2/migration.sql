-- CreateTable
CREATE TABLE "instructors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "line_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instructor_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    CONSTRAINT "shifts_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "assigned_instructor_id" TEXT,
    "start_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "goals" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "students_assigned_instructor_id_fkey" FOREIGN KEY ("assigned_instructor_id") REFERENCES "instructors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "student_id" TEXT,
    "scheduled_at" DATETIME NOT NULL,
    "end_at" DATETIME,
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schedules_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
