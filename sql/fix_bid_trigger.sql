-- Fix the bid acceptance trigger conflict
-- This modifies the stored procedure to check a session variable
-- so we can skip the update when we've already handled it in PHP

DROP PROCEDURE IF EXISTS sp_on_bid_accepted;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE sp_on_bid_accepted(IN p_project_id BIGINT UNSIGNED, IN p_bid_id BIGINT UNSIGNED)
MODIFIES SQL DATA
BEGIN
  -- Check if we should skip the update (when PHP has already handled it)
  -- If @DISABLE_TRIGGER is set to 1, we skip the UPDATE but still ensure assignment exists
  IF @DISABLE_TRIGGER IS NULL OR @DISABLE_TRIGGER = 0 THEN
    UPDATE bid
       SET status = 'Rejected'
     WHERE project_id = p_project_id
       AND bid_id <> p_bid_id
       AND status <> 'Rejected';
  END IF;

  -- Idempotent insert thanks to unique keys on assignment
  INSERT IGNORE INTO assignment (project_id, bid_id)
  VALUES (p_project_id, p_bid_id);
END$$

DELIMITER ;

