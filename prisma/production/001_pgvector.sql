-- Run after switching the Prisma datasource to PostgreSQL and applying the base schema.
-- Prisma keeps embeddings as JSON for local SQLite compatibility. In production,
-- this generated vector column enables indexed cosine search without changing the API.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS "embeddingVector" vector(1536)
  GENERATED ALWAYS AS (
    CASE
      WHEN "embedding" IS NULL THEN NULL
      ELSE translate("embedding"::text, '[]', '[]')::vector
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS "DocumentChunk_embeddingVector_hnsw"
  ON "DocumentChunk"
  USING hnsw ("embeddingVector" vector_cosine_ops);
