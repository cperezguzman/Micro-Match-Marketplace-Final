-- Add profile columns to user table
USE micro_match;

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `bio` TEXT NULL AFTER `name`,
  ADD COLUMN IF NOT EXISTS `profile_picture_url` VARCHAR(500) NULL AFTER `bio`,
  ADD COLUMN IF NOT EXISTS `experience_level` VARCHAR(50) NULL AFTER `profile_picture_url`;

