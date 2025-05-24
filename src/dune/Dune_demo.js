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

const queryId = 1215383;
const opts = {
  queryId,
  query_parameters: [
    QueryParameter.text("TextField", "Plain Text"),
    QueryParameter.number("NumberField", 3.1415926535),
    QueryParameter.date("DateField", "2022-05-04 00:00:00"),
    QueryParameter.enum("ListField", "Option 1"),
  ],
};

client
  .runQuery(opts)
  .then((executionResult) => console.log(executionResult.result?.rows));