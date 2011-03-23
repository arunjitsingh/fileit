SELECT groups.id, groups.group, groups.name
FROM groups INNER JOIN UserGroups
    ON groups.id = UserGroups.group_id
WHERE UserGroups.user_id = 1;