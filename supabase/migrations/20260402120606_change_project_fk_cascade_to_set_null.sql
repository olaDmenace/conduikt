-- Make project_id nullable so SET NULL can work
ALTER TABLE ai_generations ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE scheduled_posts ALTER COLUMN project_id DROP NOT NULL;

-- ai_generations: change CASCADE to SET NULL on project_id
ALTER TABLE ai_generations DROP CONSTRAINT ai_generations_project_id_fkey;
ALTER TABLE ai_generations ADD CONSTRAINT ai_generations_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- scheduled_posts: change CASCADE to SET NULL on project_id
ALTER TABLE scheduled_posts DROP CONSTRAINT scheduled_posts_project_id_fkey;
ALTER TABLE scheduled_posts ADD CONSTRAINT scheduled_posts_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
