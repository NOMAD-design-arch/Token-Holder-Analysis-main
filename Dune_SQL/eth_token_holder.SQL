SELECT
  address,
  balance
FROM tokens_ethereum.balances
WHERE
    token_address = {{tokenAddress}}
ORDER BY balance DESC
LIMIT 100