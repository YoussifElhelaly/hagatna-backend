-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "term" VARCHAR(100) NOT NULL,
    "normalized" VARCHAR(100) NOT NULL,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "userId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_queries_normalized_idx" ON "search_queries"("normalized");

-- CreateIndex
CREATE INDEX "search_queries_createdAt_idx" ON "search_queries"("createdAt");

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
