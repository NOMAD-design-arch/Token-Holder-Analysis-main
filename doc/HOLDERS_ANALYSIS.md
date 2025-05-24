# Bedrock Token (BR) 持有者分析系统

## 📋 项目概述

这是一个专门针对Bedrock代币（BR）的**生产级持有者分析系统**，实现了智能数据获取、清理、过滤和流通供应量计算功能。系统支持基础分析和增强分析两种模式，能够动态识别交易所热钱包，精确计算调整后流通供应量。

## 📋 功能清单

- [x] ✅ 动态地址标签查询
- [x] ✅ API速率限制处理  
- [x] ✅ Mock数据支持
- [x] ✅ 批量查询优化
- [x] ✅ 智能缓存机制
- [x] ✅ 多模式分析
- [x] ✅ 增强统计报告
- [x] ✅ 来源追踪标记
- [x] ✅ 错误处理和降级
- [x] ✅ 生产级代码结构

## 🚀 核心功能特性

### ✅ 智能数据获取与预处理
- **多源数据支持**: 从Covalent API和本地数据文件获取前100名持有者
- **动态标签查询**: 集成Dune API实现实时地址标签查询
- **智能缓存机制**: 减少API调用，提升分析效率
- **生产级API结构**: 完整的错误处理和重试机制

### ✅ 高精度地址分类与过滤
- **🏦 交易所热钱包识别**: 支持13种主流交易所（Binance、Coinbase、OKEx、Huobi、Kraken、Bybit、KuCoin等）
- **🔥 销毁地址过滤**: 自动检测零地址、Dead地址、Burn地址等销毁模式
- **🔒 锁定地址识别**: 检测DeFi协议、时间锁合约、托管合约
- **🔍 动态发现**: 通过API查询发现未知的交易所地址

### ✅ 精确供应量计算
- **调整后流通供应量**: `总供应量 - 销毁代币 - 锁定代币`
- **集中度风险分析**: 前1/5/10/20/50/100名持有者占比统计
- **详细分布统计**: 完整的代币分布和持有者分类数据

### ✅ 双模式分析系统
- **🚀 基础模式**: 使用本地标签数据，快速分析（< 1分钟）
- **⚡ 增强模式**: 集成动态API查询，全面标签覆盖（1~2分钟）

### ✅ 生产级别设计
- TypeScript类型支持
- 模块化架构
- 完整的错误处理
- 可测试的设计模式

## 📁 项目结构

```
Token-Holder-Analysis/
├── src/
│   ├── tokenAnalysis.js         # 核心代币分析类
│   ├── addressFilters.js        # 地址过滤和分类工具
│   ├── duneAPIHelper.js         # Dune API集成助手
│   ├── test.js                  # 完整测试套件
│   └── goldRushTokenHold.js     # 数据获取脚本
├── holders/                      # 持有者数据目录
├── label/                        # 地址标签数据目录
├── basic-analysis-results/       # 基础分析结果
├── enhanced-analysis-results/    # 增强分析结果
├── run_enhanced_analysis.js      # 双模式执行脚本
├── package.json
├── .env.example                  # 环境变量示例
└── .gitignore
```

## 🛠️ 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd Token-Holder-Analysis

# 安装依赖
npm install

# 配置环境变量（可选，用于增强模式）
cp .env.example .env
# 编辑 .env 文件，添加你的 Dune API Key
```

### 2. 数据准备

确保以下数据文件存在：
- `holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json` - 持有者数据
- `label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json` - BNB链标签数据  
- `label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json` - 以太坊链标签数据

### 3. 运行分析

#### 🚀 基础模式
```bash
# 运行基础分析（仅本地数据）
node run_enhanced_analysis.js

# 或运行测试
node src/test.js
```

#### ⚡ 增强模式（完整功能）
```bash
# 运行增强分析（包含动态API查询）
node run_enhanced_analysis.js --enhanced
```

## 🎯 使用模式对比

| 功能特性 | 基础模式 | 增强模式 |
|---------|---------|---------|
| **分析速度** | 🚀 快速（< 30秒） | ⏳ 较慢（1-2分钟） |
| **API依赖** | ❌ 无需API Key | ✅ 需要Dune API Key |
| **标签覆盖** | 📋 本地标签数据 | 🔍 本地 + 动态查询 |
| **新发现** | ❌ 固定分类 | ✅ 动态发现交易所 |
| **适用场景** | 快速检查、开发测试 | 生产分析、完整报告 |

## 📊 分析结果示例

### 基础分析输出
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

### 增强分析额外信息
```
🔍 标签分析统计
- 📋 本地标签匹配: 15
- 🔍 动态查询发现: 8  
- 🎭 Mock数据生成: 3
- 📊 总标签覆盖率: 26.00%

🚀 动态发现示例
- 🔍 Dune API查询: 0xf89d7b9c864f589bbf53a82105107622b35eaa40
- ✅ 动态发现交易所: 0xf89d...eaa40 -> Bybit

📊 查询统计
- 本地标签使用: 15
- 动态标签发现: 8
- 查询缓存大小: 25
- 剩余查询配额: 7/分钟
```

## 🔧 高级配置

### 环境变量配置
```bash
# .env 文件
DUNE_API_KEY=your_dune_api_key_here
DUNE_RATE_LIMIT_PER_MINUTE=10
```

### API Key获取
1. 访问 [Dune Analytics](https://dune.com/settings/api)
2. 注册并申请免费API Key
3. 将API Key配置到 `.env` 文件

### 地址分类规则

#### 🔥 销毁地址检测
- 全零地址: `0x000...000`
- Dead地址: `0x000...dead`  
- Burn地址: 包含"burn"关键字的地址
- 系统预定义销毁地址列表

#### 🏦 支持的交易所
- **Binance**: 8个已知热钱包地址
- **Coinbase**: 6个已知热钱包地址
- **OKEx**: 3个已知热钱包地址
- **Huobi**: 4个已知热钱包地址
- **Kraken**: 3个已知热钱包地址
- **Bybit, KuCoin, Gate.io** 等其他主流交易所

#### 🔒 DeFi协议地址
- Uniswap V2/V3、PancakeSwap
- Compound、Aave、MakerDAO
- Curve、Yearn Finance、Balancer
- SushiSwap、1inch

## 💻 编程接口

### BedrockTokenAnalysis 类

```javascript
import { BedrockTokenAnalysis } from './src/tokenAnalysis.js';

const analyzer = new BedrockTokenAnalysis();

// 加载标签数据
analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');

// 加载持有者数据
analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');

// 执行分析
const results = analyzer.processHoldersData();

// 生成报告
const report = analyzer.generateReport();
console.log(report);

// 保存结果
analyzer.saveResults('analysis-results');
```

### 核心方法说明

| 方法 | 功能 | 返回值 |
|------|------|--------|
| `loadLabels(filePath)` | 加载地址标签数据 | `void` |
| `loadHoldersData(filePath)` | 加载持有者数据 | `void` |
| `processHoldersData(enhanced = false)` | 处理分析数据 | `ProcessedData` |
| `generateReport()` | 生成分析报告 | `string` |
| `saveResults(outputDir)` | 保存分析结果 | `void` |
| `getConcentrationAnalysis()` | 获取集中度分析 | `ConcentrationData` |

## 📈 输出文件说明

### 基础模式输出
```
basic-analysis-results/
├── bedrock-analysis-{timestamp}.json           # 完整分析数据
├── bedrock-report-{timestamp}.txt              # 格式化报告
└── bedrock-valid-holders-{timestamp}.csv       # 有效持有者CSV
```

### 增强模式输出
```
enhanced-analysis-results/
├── bedrock-enhanced-analysis-{timestamp}.json  # 增强分析数据
├── bedrock-enhanced-report-{timestamp}.txt     # 增强报告
├── bedrock-valid-holders-enhanced-{timestamp}.csv # 增强CSV数据
└── bedrock-dynamic-labels-{timestamp}.json     # 动态发现标签
```

## 🧪 测试

### 运行测试套件
```bash
node src/test.js
```

### 测试覆盖内容
- ✅ 地址过滤器功能测试
- ✅ 数据加载和处理测试
- ✅ API集成功能测试
- ✅ 分析结果验证测试
- ✅ 文件保存功能测试

## ⚡ 性能优化

### API速率限制处理
- **智能速率管理**: 每分钟最多100次API调用
- **自动降级机制**: API失败时切换到Mock数据
- **批量查询优化**: 减少API调用次数
- **查询缓存**: 避免重复查询相同地址

### 渐进式查询策略
```
地址分类流程:
本地标签检查 → 动态缓存查询 → Dune API查询 → Mock数据回退
     ↓              ↓              ↓            ↓
   已知标签       缓存命中        API调用      模拟数据
```

## 🛡️ 错误处理

系统包含完整的错误处理机制：
- **API调用失败**: 自动重试和降级处理
- **数据格式验证**: 完整的输入数据验证
- **文件读写错误**: 详细的错误日志和恢复
- **网络异常**: 超时处理和连接重试

## 🔧 技术栈

- **运行环境**: Node.js + ES Modules
- **数据获取**: Covalent API, Dune Analytics API
- **数据处理**: JSON处理, 正则表达式匹配
- **文件操作**: 原生fs模块, CSV导出
- **类型支持**: JSDoc类型注释

## 🎯 适用场景

### 🏢 机构投资者
- 代币持有者尽职调查
- 流通供应量验证
- 集中度风险评估

### 📊 数据分析师
- 代币分布分析
- 交易所持仓监控
- DeFi锁定分析

### 🔍 研究人员
- 代币经济学研究
- 持有者行为分析
- 流动性分析

### 👨‍💻 开发者
- 集成到现有系统
- 自定义分析逻辑
- 扩展支持新代币

## 🚧 未来规划

- [ ] 支持更多区块链网络
- [ ] 实时持有者变化监控
- [ ] 图形化分析报告
- [ ] RESTful API接口
- [ ] Web界面支持

## 📄 许可证

ISC License

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📞 技术支持

如有问题或建议，请联系开发团队或创建Issue。

---

**⭐ 如果这个项目对您有帮助，请给它一个Star！** 