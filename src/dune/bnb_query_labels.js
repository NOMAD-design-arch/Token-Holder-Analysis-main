import { QueryParameter, DuneClient } from "@duneanalytics/client-sdk";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载.env文件
dotenv.config();

const DUNE_API_KEY = process.env.DUNE_API_KEY;

if (!DUNE_API_KEY) {
  console.error("请设置DUNE_API_KEY环境变量");
  process.exit(1);
}

const client = new DuneClient(DUNE_API_KEY);

const queryId = 5176963;
const opts = {
  queryId
};

// 确保label文件夹存在
const labelDir = 'label';
if (!fs.existsSync(labelDir)) {
  fs.mkdirSync(labelDir, { recursive: true });
  console.log(`已创建文件夹: ${labelDir}`);
}

client
  .runQuery(opts)
  .then((executionResult) => {
    const data = executionResult.result?.rows;
    
    if (data) {
      // 生成文件名（包含时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `bnb_query_${queryId}_${timestamp}.json`;
      const filePath = path.join(labelDir, fileName);
      
      // 将数据保存为JSON文件
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`查询结果已保存到: ${filePath}`);
      console.log(`共保存 ${data.length} 条记录`);
    } else {
      console.log('查询没有返回数据');
    }
  })
  .catch((error) => {
    console.error('查询执行失败:', error);
  });