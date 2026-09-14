-- Prisma Migrate creates a temporary "shadow database" to detect schema drift.
-- The default compose user needs CREATE/DROP on arbitrary schemas for that to work.
GRANT ALL PRIVILEGES ON *.* TO 'deutsch'@'%';
FLUSH PRIVILEGES;
