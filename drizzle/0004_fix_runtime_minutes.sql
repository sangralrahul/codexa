-- One-off correction for preview-minute over-counting.
-- Before this fix, a preview sandbox that stopped while nobody was watching (the runner stops idle
-- sandboxes after 30 minutes) was billed from its last check-in until the next time someone opened
-- the project, which could be days. While a preview is watched, minutes are recorded in ~5-minute
-- steps, so a single runtime_minutes event above 35 minutes can only come from that gap. Trim each
-- such event to the 30 minutes the sandbox can have kept running unobserved.
UPDATE `usage_events` SET `quantity` = 30 WHERE `kind` = 'runtime_minutes' AND `quantity` > 35;
