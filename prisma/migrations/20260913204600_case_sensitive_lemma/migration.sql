-- German distinguishes words by case: `sie` (she/they) vs `Sie` (formal you),
-- and every noun is capitalised. MySQL's default utf8mb4_unicode_ci collation is
-- case-insensitive, so the unique index on (lemma, pos) silently merged such
-- pairs and one of them was lost on seed.
--
-- Make the lemma column accent- and case-sensitive so those stay distinct.
-- `searchLemma` deliberately stays case-insensitive — it is the normalized,
-- lowercased, umlaut-folded search key.
ALTER TABLE `Word`
  MODIFY `lemma` VARCHAR(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL;
