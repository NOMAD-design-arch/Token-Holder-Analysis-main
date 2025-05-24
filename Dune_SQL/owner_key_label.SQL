-- 1. 列出所有不同的 owner_key
SELECT
  owner_key
FROM
  labels.owner_addresses
WHERE
  blockchain = 'ethereum'
GROUP BY
  owner_key
ORDER BY
  owner_key
