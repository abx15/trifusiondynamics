-- CreateIndex
CREATE INDEX "Lead_organizationId_stage_createdAt_idx" ON "crm"."Lead"("organizationId", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "Project_organizationId_status_createdAt_idx" ON "projects"."Project"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Project_organizationId_clientId_idx" ON "projects"."Project"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "Task_projectId_status_createdAt_idx" ON "projects"."Task"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_createdAt_idx" ON "billing"."Invoice"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_clientId_status_idx" ON "billing"."Invoice"("clientId", "status");

-- CreateIndex
CREATE INDEX "Employee_organizationId_status_department_idx" ON "hr"."Employee"("organizationId", "status", "department");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookId_createdAt_idx" ON "developer"."WebhookDelivery"("webhookId", "createdAt");
