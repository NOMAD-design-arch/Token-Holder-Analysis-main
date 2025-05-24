-- 2. 列出所有不同的 custody_owner
SELECT
  custody_owner
FROM
  labels.owner_addresses
WHERE
  blockchain = 'ethereum'
GROUP BY
  custody_owner
ORDER BY
  custody_owner
