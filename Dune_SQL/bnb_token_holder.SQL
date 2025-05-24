SELECT
  address,
  balance
FROM tokens_bnb.balances
WHERE
    token_address = {{tokenAddress}}
ORDER BY balance DESC
LIMIT 100