-- CreateIndex
CREATE UNIQUE INDEX `ExamItem_section_title_key` ON `ExamItem`(`section`, `title`);

-- CreateIndex
CREATE UNIQUE INDEX `Exercise_tag_prompt_key` ON `Exercise`(`tag`, `prompt`(191));

-- CreateIndex
CREATE UNIQUE INDEX `ReadingText_level_title_key` ON `ReadingText`(`level`, `title`);

