-- CreateTable
CREATE TABLE `Word` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lemma` VARCHAR(120) NOT NULL,
    `level` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL,
    `pos` ENUM('VERB', 'NOUN', 'ADJ', 'PREP', 'ADV', 'OTHER') NOT NULL,
    `subcategory` VARCHAR(60) NOT NULL,
    `translationsEn` JSON NOT NULL,
    `exampleDe` TEXT NULL,
    `exampleEn` TEXT NULL,
    `searchLemma` VARCHAR(120) NOT NULL,

    INDEX `Word_level_pos_subcategory_idx`(`level`, `pos`, `subcategory`),
    INDEX `Word_searchLemma_idx`(`searchLemma`),
    UNIQUE INDEX `Word_lemma_pos_key`(`lemma`, `pos`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NounDetail` (
    `wordId` INTEGER NOT NULL,
    `article` VARCHAR(5) NOT NULL,
    `plural` VARCHAR(120) NOT NULL,

    PRIMARY KEY (`wordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerbDetail` (
    `wordId` INTEGER NOT NULL,
    `isSeparable` BOOLEAN NOT NULL DEFAULT false,
    `prefix` VARCHAR(20) NULL,
    `isIrregular` BOOLEAN NOT NULL DEFAULT false,
    `auxiliary` VARCHAR(10) NOT NULL,
    `praesens` JSON NOT NULL,
    `praeteritum` VARCHAR(60) NULL,
    `partizip2` VARCHAR(60) NULL,

    PRIMARY KEY (`wordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdjectiveDetail` (
    `wordId` INTEGER NOT NULL,
    `comparative` VARCHAR(120) NOT NULL,
    `superlative` VARCHAR(120) NULL,

    PRIMARY KEY (`wordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WordForm` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wordId` INTEGER NOT NULL,
    `form` VARCHAR(120) NOT NULL,
    `searchForm` VARCHAR(120) NOT NULL,
    `formType` VARCHAR(30) NOT NULL,

    INDEX `WordForm_searchForm_idx`(`searchForm`),
    UNIQUE INDEX `WordForm_wordId_searchForm_formType_key`(`wordId`, `searchForm`, `formType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Translation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wordId` INTEGER NOT NULL,
    `text` VARCHAR(160) NOT NULL,
    `searchText` VARCHAR(160) NOT NULL,

    INDEX `Translation_searchText_idx`(`searchText`),
    UNIQUE INDEX `Translation_wordId_searchText_key`(`wordId`, `searchText`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lesson` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `level` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL,
    `topic` VARCHAR(60) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `summary` TEXT NOT NULL,
    `bodyMd` TEXT NOT NULL,
    `keyRules` JSON NOT NULL,
    `examples` JSON NOT NULL,
    `exerciseTag` VARCHAR(60) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Lesson_slug_key`(`slug`),
    INDEX `Lesson_level_order_idx`(`level`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Exercise` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL,
    `topic` VARCHAR(60) NOT NULL,
    `tag` VARCHAR(60) NOT NULL,
    `type` ENUM('MULTIPLE_CHOICE', 'FILL_BLANK', 'SENTENCE_BUILD') NOT NULL,
    `prompt` TEXT NOT NULL,
    `options` JSON NULL,
    `answer` VARCHAR(255) NOT NULL,
    `explanation` TEXT NOT NULL,

    INDEX `Exercise_level_tag_idx`(`level`, `tag`),
    INDEX `Exercise_level_type_idx`(`level`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReadingText` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `bodyDe` TEXT NOT NULL,
    `glossary` JSON NOT NULL,
    `questions` JSON NOT NULL,

    INDEX `ReadingText_level_idx`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL,
    `section` ENUM('READING', 'LISTENING', 'WRITING', 'SPEAKING', 'COMPREHENSION') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `payload` JSON NOT NULL,

    INDEX `ExamItem_level_section_idx`(`level`, `section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PronunciationEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(20) NOT NULL,
    `grapheme` VARCHAR(40) NOT NULL,
    `example` VARCHAR(80) NOT NULL,
    `description` TEXT NOT NULL,
    `tip` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `PronunciationEntry_symbol_key`(`symbol`),
    INDEX `PronunciationEntry_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheatSheetSection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `bodyMd` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `CheatSheetSection_level_order_idx`(`level`, `order`),
    UNIQUE INDEX `CheatSheetSection_level_title_key`(`level`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(190) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `currentLevel` ENUM('A1', 'A2', 'B1', 'B2') NOT NULL DEFAULT 'A1',
    `levelMode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO',
    `settings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SrsCard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `wordId` INTEGER NOT NULL,
    `state` ENUM('KNOWN', 'SHAKY', 'UNKNOWN') NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `lastReviewedAt` DATETIME(3) NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `lapses` INTEGER NOT NULL DEFAULT 0,

    INDEX `SrsCard_userId_dueAt_idx`(`userId`, `dueAt`),
    INDEX `SrsCard_userId_state_idx`(`userId`, `state`),
    UNIQUE INDEX `SrsCard_userId_wordId_key`(`userId`, `wordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `wordId` INTEGER NOT NULL,
    `fromState` ENUM('KNOWN', 'SHAKY', 'UNKNOWN') NULL,
    `toState` ENUM('KNOWN', 'SHAKY', 'UNKNOWN') NOT NULL,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReviewLog_userId_reviewedAt_idx`(`userId`, `reviewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExerciseAttempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `exerciseId` INTEGER NOT NULL,
    `correct` BOOLEAN NOT NULL,
    `givenAnswer` VARCHAR(255) NOT NULL,
    `source` VARCHAR(30) NOT NULL,
    `answeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExerciseAttempt_userId_answeredAt_idx`(`userId`, `answeredAt`),
    INDEX `ExerciseAttempt_userId_exerciseId_idx`(`userId`, `exerciseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `game` ENUM('WORD_MATCH', 'GENDER_BATTLE', 'LISTENING_QUIZ', 'FILL_BLANK') NOT NULL,
    `score` INTEGER NOT NULL,
    `total` INTEGER NOT NULL,
    `durationMs` INTEGER NOT NULL DEFAULT 0,
    `playedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GameSession_userId_playedAt_idx`(`userId`, `playedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExamAttempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `examItemId` INTEGER NOT NULL,
    `section` ENUM('READING', 'LISTENING', 'WRITING', 'SPEAKING', 'COMPREHENSION') NOT NULL,
    `score` INTEGER NOT NULL,
    `total` INTEGER NOT NULL,
    `detail` JSON NULL,
    `takenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExamAttempt_userId_takenAt_idx`(`userId`, `takenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyChallenge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `date` VARCHAR(10) NOT NULL,
    `exerciseIds` JSON NOT NULL,
    `answered` INTEGER NOT NULL DEFAULT 0,
    `score` INTEGER NOT NULL DEFAULT 0,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DailyChallenge_userId_date_idx`(`userId`, `date`),
    UNIQUE INDEX `DailyChallenge_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mistake` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `kind` ENUM('VOCAB', 'EXERCISE', 'GAME', 'EXAM') NOT NULL,
    `refId` INTEGER NULL,
    `prompt` TEXT NOT NULL,
    `expected` VARCHAR(255) NOT NULL,
    `given` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Mistake_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityDay` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `date` VARCHAR(10) NOT NULL,
    `reviews` INTEGER NOT NULL DEFAULT 0,
    `exercises` INTEGER NOT NULL DEFAULT 0,
    `games` INTEGER NOT NULL DEFAULT 0,
    `xp` INTEGER NOT NULL DEFAULT 0,

    INDEX `ActivityDay_userId_date_idx`(`userId`, `date`),
    UNIQUE INDEX `ActivityDay_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NounDetail` ADD CONSTRAINT `NounDetail_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerbDetail` ADD CONSTRAINT `VerbDetail_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdjectiveDetail` ADD CONSTRAINT `AdjectiveDetail_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WordForm` ADD CONSTRAINT `WordForm_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Translation` ADD CONSTRAINT `Translation_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SrsCard` ADD CONSTRAINT `SrsCard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SrsCard` ADD CONSTRAINT `SrsCard_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewLog` ADD CONSTRAINT `ReviewLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewLog` ADD CONSTRAINT `ReviewLog_wordId_fkey` FOREIGN KEY (`wordId`) REFERENCES `Word`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExerciseAttempt` ADD CONSTRAINT `ExerciseAttempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExerciseAttempt` ADD CONSTRAINT `ExerciseAttempt_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `Exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameSession` ADD CONSTRAINT `GameSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamAttempt` ADD CONSTRAINT `ExamAttempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExamAttempt` ADD CONSTRAINT `ExamAttempt_examItemId_fkey` FOREIGN KEY (`examItemId`) REFERENCES `ExamItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyChallenge` ADD CONSTRAINT `DailyChallenge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mistake` ADD CONSTRAINT `Mistake_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityDay` ADD CONSTRAINT `ActivityDay_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
