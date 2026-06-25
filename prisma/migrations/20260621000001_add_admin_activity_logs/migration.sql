CREATE TABLE "admin_activity_logs" (
    "id"          TEXT        NOT NULL,
    "adminId"     TEXT        NOT NULL,
    "action"      VARCHAR(100) NOT NULL,
    "entityType"  VARCHAR(50),
    "entityId"    VARCHAR(100),
    "entityLabel" VARCHAR(255),
    "metadata"    JSONB,
    "ipAddress"   VARCHAR(50),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_activity_logs_adminId_idx"            ON "admin_activity_logs"("adminId");
CREATE INDEX "admin_activity_logs_createdAt_idx"          ON "admin_activity_logs"("createdAt");
CREATE INDEX "admin_activity_logs_entityType_entityId_idx" ON "admin_activity_logs"("entityType", "entityId");

ALTER TABLE "admin_activity_logs"
    ADD CONSTRAINT "admin_activity_logs_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
