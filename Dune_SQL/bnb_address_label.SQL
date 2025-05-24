 blockchain = 'bnb'
  AND (
    -- 原有通用匹配
    lower(custody_owner) LIKE '%exchange%' OR
    lower(account_owner)  LIKE '%hot%'      OR

    -- 常见交易所名称（托管方 or 账户持有人标签中出现）
    lower(custody_owner) LIKE '%binance%'   OR
    lower(account_owner)  LIKE '%binance%' OR

    lower(custody_owner) LIKE '%coinbase%'  OR
    lower(account_owner)  LIKE '%coinbase%' OR

    lower(custody_owner) LIKE '%kraken%'    OR
    lower(account_owner)  LIKE '%kraken%'   OR

    lower(custody_owner) LIKE '%okx%'       OR
    lower(account_owner)  LIKE '%okx%'      OR

    lower(custody_owner) LIKE '%huobi%'     OR
    lower(account_owner)  LIKE '%huobi%'    OR

    lower(custody_owner) LIKE '%bybit%'     OR
    lower(account_owner)  LIKE '%bybit%'    OR

    lower(custody_owner) LIKE '%kucoin%'    OR
    lower(account_owner)  LIKE '%kucoin%'   OR

    lower(custody_owner) LIKE '%bitfinex%'  OR
    lower(account_owner)  LIKE '%bitfinex%' OR

    lower(custody_owner) LIKE '%gate%'      OR
    lower(account_owner)  LIKE '%gate%'     OR

    lower(custody_owner) LIKE '%bithumb%'   OR
    lower(account_owner)  LIKE '%bithumb%'  OR

    lower(custody_owner) LIKE '%poloniex%'  OR
    lower(account_owner)  LIKE '%poloniex%' OR

    lower(custody_owner) LIKE '%mexc%'      OR
    lower(account_owner)  LIKE '%mexc%'     OR

    lower(custody_owner) LIKE '%crypto.com%' OR
    lower(account_owner)  LIKE '%crypto.com%'
  )
ORDER BY
  created_at DESC
LIMIT
  1000
