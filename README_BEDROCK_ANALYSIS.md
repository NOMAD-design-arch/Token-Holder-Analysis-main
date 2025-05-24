# Bedrock Token (BR) 持有者分析系统

## 项目概述

这是一个专门针对Bedrock代币（BR）的持有者分析系统，实现了生产级别的数据获取、清理、过滤和流通供应量计算功能。

## 功能特性

### ✅ 数据获取与预处理
- 支持从Covalent API获取前100名持有者数据
- 维护生产级别的API调用结构
- 自动处理API限制和错误重试

### ✅ 数据清理与过滤
- **交易所热钱包过滤**: 识别并排除主流交易所地址
  - Binance, Coinbase, OKEx, Huobi, Kraken 等
- **销毁地址过滤**: 自动检测各种销毁地址模式
  - 零地址 (`0x000...000`)
  - Dead地址 (`0x000...dead`)
  - 其他常见销毁地址格式
- **锁定地址识别**: 检测DeFi协议和时间锁合约
  - Uniswap, PancakeSwap, Compound, Aave等协议地址
  - 时间锁和托管合约

### ✅ 供应量计算
- **调整后流通供应量**: `总供应量 - 销毁代币 - 锁定代币`
- 详细的代币分布统计
- 持有者集中度分析

### ✅ 生产级别设计
- TypeScript类型支持
- 模块化架构
- 完整的错误处理
- 可测试的设计模式

## 文件结构

```
├── src/
│   ├── tokenAnalysis.js      # 主要的代币分析类
│   ├── addressFilters.js     # 地址过滤和分类工具
│   ├── test.js              # 测试文件
│   └── goldRushTokenHold.js  # 数据获取脚本
├── holders/                  # 持有者数据目录
├── label/                    # 地址标签数据目录
├── analysis-results/         # 分析结果输出目录
└── package.json
```

## 安装和设置

### 1. 安装依赖

```bash
npm install
```

### 2. 数据准备

确保以下数据文件存在：
- `holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json` - 持有者数据
- `label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json` - BNB链标签数据
- `label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json` - 以太坊链标签数据

## 使用方法

### 快速开始

```bash
# 运行完整分析
node src/tokenAnalysis.js

# 运行测试
node src/test.js
```

### 编程使用

```javascript
import { BedrockTokenAnalysis } from './src/tokenAnalysis.js';

const analyzer = new BedrockTokenAnalysis();

// 加载数据
analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');
analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');

// 处理数据
const results = analyzer.processHoldersData();

// 生成报告
const report = analyzer.generateReport();
console.log(report);

// 保存结果
analyzer.saveResults('output-directory');
```

## 分析结果

### 统计信息
- 总持有者数量和分类统计
- 有效持有者、交易所、销毁地址、锁定地址的数量和比例
- 代币分布情况

### 调整后流通供应量
使用公式：`总供应量 - 销毁代币 - 锁定代币`

### 持有者集中度分析
- 前1、5、10、20、50、100名持有者的代币占比
- 集中度风险评估

### 输出文件
- `bedrock-analysis-{timestamp}.json` - 完整的分析数据
- `bedrock-report-{timestamp}.txt` - 格式化的分析报告
- `bedrock-valid-holders-{timestamp}.csv` - 有效持有者CSV数据

## API参考

### BedrockTokenAnalysis 类

#### 方法

- `loadLabels(filePath)` - 加载地址标签数据
- `loadHoldersData(filePath)` - 加载持有者数据
- `processHoldersData()` - 处理和分析数据
- `generateReport()` - 生成分析报告
- `saveResults(outputDir)` - 保存分析结果
- `getConcentrationAnalysis()` - 获取集中度分析

### AddressFilters 类

#### 方法

- `isBurnAddress(address)` - 检查是否为销毁地址
- `getExchangeName(address)` - 获取交易所名称
- `isDeFiProtocolAddress(address)` - 检查是否为DeFi协议地址
- `classifyAddress(address, label)` - 地址分类
- `classifyAddresses(addresses)` - 批量地址分类

## 配置说明

### 销毁地址检测
系统会自动检测以下类型的销毁地址：
- 全零地址
- 包含"dead"的地址
- 包含"burn"的地址
- 系统预定义的销毁地址列表

### 交易所地址检测
支持主流交易所的热钱包地址检测：
- Binance (8个已知地址)
- Coinbase (6个已知地址)
- OKEx (3个已知地址)
- Huobi (4个已知地址)
- Kraken (3个已知地址)

### DeFi协议地址
包含主流DeFi协议的合约地址：
- Uniswap V2/V3
- PancakeSwap
- Compound
- Aave
- MakerDAO
- Curve
- Yearn Finance
- Balancer
- SushiSwap
- 1inch

## 示例输出

```
🚀 Bedrock Token (BR) 持有者分析报告
=============================================

📊 基本信息
- 代币地址: 0xff7d6a96ae471bbcd7713af9cb1feeb16cf56b41
- 链名称: bsc-mainnet
- 总供应量: 1000.00M BR

📈 持有者统计
- 总持有者数量: 100
- 有效持有者: 98 (98.00%)
- 交易所持有者: 0 (0.00%)
- 销毁地址: 0 (0.00%)
- 锁定地址: 2 (2.00%)

💰 代币分布
- 总流通供应量: 1000.00M BR
- 已销毁代币: 0.00M BR (0.00%)
- 交易所余额: 0.00M BR (0.00%)
- 锁定余额: 20.00M BR (2.00%)

🔥 调整后流通供应量
- 调整后供应量: 980.00M BR
- 调整比例: 98.00%
```

## 测试

运行测试套件：

```bash
node src/test.js
```

测试包括：
- 地址过滤器功能测试
- 数据加载和处理测试
- 分析结果验证
- 保存功能测试

## 技术栈

- Node.js + ES Modules
- Covalent API for data fetching
- 文件系统操作 (fs)
- JSON数据处理
- 正则表达式模式匹配

## 错误处理

系统包含完整的错误处理机制：
- API调用失败重试
- 数据格式验证
- 文件读写错误处理
- 详细的错误日志

## 扩展性

系统设计为高度可扩展：
- 支持添加新的交易所地址
- 支持自定义销毁地址模式
- 支持新的DeFi协议地址
- 模块化设计便于功能扩展

## 许可证

ISC License

## 支持

如有问题或建议，请联系开发团队。 