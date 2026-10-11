-- CreateTable
CREATE TABLE "hr"."AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeId_timestamp_idx" ON "hr"."AttendanceRecord"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "AttendanceRecord_organizationId_timestamp_idx" ON "hr"."AttendanceRecord"("organizationId", "timestamp");

-- AddForeignKey
ALTER TABLE "hr"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "hr"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
