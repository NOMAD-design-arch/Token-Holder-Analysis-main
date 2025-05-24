import { QueryParameter, DuneClient } from "@duneanalytics/client-sdk";
import dotenv from 'dotenv';

// 加载.env文件
dotenv.config();

const DUNE_API_KEY = process.env.DUNE_API_KEY;

if (!DUNE_API_KEY) {
  console.error("请设置DUNE_API_KEY环境变量");
  process.exit(1);
}

const client = new DuneClient(DUNE_API_KEY);

const queryId = 5177452;
const opts = {
  queryId,
  query_parameters: [
    QueryParameter.text("query_address", "0xf89d7b9c864f589bbF53a82105107622B35EaA40"),
  ],
};

client
  .runQuery(opts)
  .then((executionResult) => console.log(executionResult.result?.rows));