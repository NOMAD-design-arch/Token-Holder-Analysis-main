# Token Holder Analysis 代币持有者分析平台

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6%2B-yellow.svg)

**专业的区块链代币持有者分析工具套件**

*支持持有者分布分析、集中度风险评估、地址风险分类等多维度分析*

</div>

## 📋 项目概述

Token Holder Analysis 是一个专业的区块链代币分析平台，专注于深度分析代币持有者的分布情况、集中度风险和地址风险分类。该项目集成了多个数据源，提供全面的分析报告，帮助投资者、项目方和研究人员更好地理解代币的持有者生态。

## 个人心得

### 任务一 思考点：

#### 1.如何获取top 前100名的持有者地址

**1.1 思路一**
通过区块链全节点RPC，扫描所有区块的 Bedrock transfer 事件，本地数据库统计，对入账出账的地址进行加减运算。最后对字段balance降序，取前100名。

**1.2 思路二**
通过已有数据的项目，如Etherscan，Covalent 调用api获得token holder的前100名。

**1.3 思路三**
通过Etherscan的token API 查询该token的所有transfer交易，进行数据库统计，排序。

方式1需要全节点，建表，以及长时间的获取数据。方式3,使用免费api 5 tps，需要高级付费API。免费api大规模查询不具备可行性。因此根据任务时间考虑，选取思路二，快速实现该功能。

#### 2. 如何获得尽可能多的交易所热钱包，过滤这些地址。

这是任务的难点，花的时间较多。

根据调研：
- Etherscan的付费高级API 可以查询address label
- Dune，编写SQL语句，可以查询指定的address label集合，以及针对单地址查询。

由于查询label的API较慢，频繁查询，容易错误。因此考虑建立本地label缓存库。
考虑快速实现，则使用Dune，首先查询较多的label作为本地缓存（当前示例取了1000个地址）。同时如果地址没有命中缓存，则动态查询label。另一方面，动态查询的结果也作为缓存集，从而提高效率和准确性。

燃烧地址，黑洞地址较明显，一般从项目方文档中可以获取。

#### 3. 如何找到尽可能多的锁仓地址，锁定的余额。这个也是难点和开放思考点。

**3.1：如何定义锁定的余额？**

a：锁定时间的长短划分？DeFi协议中的：staking，restaking，借贷协议，验证者节点pos长期质押的token

b：燃烧地址，黑洞地址的金额。

c：超长时间的睡眠地址是否考虑。

d：vesting合约地址，随着时间，项目方释放token。

由于没有维护label数据库，通过上文查询地址label的方式，进行判断该地址的类型，是否为上述类型。若是，则进行运行，得出校对后的流通供应量。

这个功能是值得后续深度优化，提高准确度的。例如接入已知维护的本地label数据库；使用多源API复合查询提高准确性；

### 任务二 思考点：

1.根据任务一holders的查询结果数据，计算份额。

2.理解HHI中心化分析指标，使用HHI = Σ(Pi²) 分别计算指标。

3.大于supply 5%的地址，最多20个，根据任务一holders的查询结果数据过滤即可。

### 任务三 思考点：

地址分类算法是个难点，开放思考点，存在许多研究和优化空间。例如标签匹配，参数设置合理性以及每个模式的匹配算法。

结合tips，思路如下：
根据地址的近期历史交易的特点，从多个方面进行加权评分，若超过指定阈值，则给该地址打上对应标签。
team/vesting，Market Makers，CEX，未知

#### 1.首先判断该地址是否为已有label标签地址。

查询本地数据库中的已知交易所标签，若没命中则再动态Dune API查询标签。根据标签匹配进行分类，若命中则返回地址分类结果。

#### 2.若label没命中，则进行链上行为分析，分别针对三种模式进行加权评分。

**2.1 CEX地址判断**
根据存款模式，交易地址的多样性，交易token的多样性，以及大额集中交易进行加权计算。

**2.2 Market Maker地址判断**
根据双向交易比例，交易频率，时间间隔，代币种类指标进行加权计算。

**2.3 Team/Vesting地址判断。**
根据地址检测，时间规律性，周期性模式识别，金额一致性指标进行加权计算。

#### 3.最终选取该地址行为分析最高分的，作为最终分类结果。

## ✨ 核心功能

### 🏗️ 1. 持有者分析 (Token Analysis)
- **深度持有者分析**: 分析代币的持有者分布和流通供应量
- **地址分类识别**: 自动识别销毁地址、锁定地址、交易所地址
- **动态标签查询**: 集成Dune Analytics API，实时查询地址标签
- **多源数据整合**: 结合本地标签库和外部API数据

**主要特性**:
- 支持自定义代币合约地址分析
- 自动过滤销毁和锁定地址
- 生成详细的持有者报告
- 支持CSV格式数据导出

### 📊 2. 集中度分析 (Concentration Analysis)
- **HHI指数计算**: 使用Herfindahl-Hirschman指数评估市场集中度
- **Top N持有者分析**: 分析前1、5、10、20名持有者的份额
- **基尼系数计算**: 衡量财富分配的不平等程度
- **大户风险标记**: 自动标记超过阈值的大户地址

**风险评估等级**:
- **低风险**: HHI < 1500，持有权分散
- **中等风险**: 1500 ≤ HHI < 2500，存在一定集中度
- **高风险**: HHI ≥ 2500，持有权高度集中

### 🛡️ 3. 风险地址分类 (Risk Classification)
- **智能地址分类**: 基于标签和交易模式的分类
- **四大类别识别**:
  - **Team/Vesting**: 团队/释放地址
  - **Market Makers**: 做市商地址
  - **CEX**: 中心化交易所地址
  - **Unknown**: 未知类型地址

**分析维度**:
- 交易频率和模式分析
- 双向交易比例计算
- 定期转账模式识别
- 与已知地址库匹配

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 环境配置
创建 `.env` 文件并配置以下API密钥：
```env
DUNE_API_KEY=your_dune_api_key
Bscscan_API_KEY=your_bscscan_api_key
```

### 运行示例
```bash
# 安装依赖
npm install

# 运行Holders分析
npm run holdersAnalysis

# 运行集中度分析
npm run concentrationAnalysis

# 运行风险分类分析
npm run riskAnalysis
```

## 📁 项目结构

```
Token-Holder-Analysis/
├── src/                          # 源代码目录
│   ├── tokenAnalysis.js         # 持有者分析模块
│   ├── concentrationAnalysis.js # 集中度分析模块
│   ├── risk_Address_Classification.js # 风险地址分类模块
│   ├── utils/                    # 工具函数
│   │   ├── duneAPIHelper.js     # Dune API助手
│   │   ├── addressFilters.js    # 地址过滤器
│   │   └── goldRushTokenHold.js # 代币持有工具
│   └── dune/                    # Dune SQL查询文件
├── holders/                      # 持有者数据目录
├── label/                        # 地址标签数据
├── results/                      # 分析结果输出
├── doc/                         # 详细文档
├── test/                        # 测试文件
└── run/                         # 运行分析程序
```

## 📊 使用示例

### 1. 持有者分析
```javascript
import { BedrockTokenAnalysis } from './src/tokenAnalysis.js';

const analyzer = new BedrockTokenAnalysis();

// 加载标签数据
analyzer.loadLabels('./label/bnb_labels.json');

// 加载持有者数据
analyzer.loadHoldersData('./holders/bedrock_holders.json');

// 执行分析
await analyzer.processHoldersData(true);

// 生成报告
const report = analyzer.generateReport();
console.log(report);
```

### 2. 集中度分析
```javascript
import { ConcentrationAnalysis } from './src/concentrationAnalysis.js';

const concentration = new ConcentrationAnalysis(validHolders, totalSupply);

// 执行全面分析
const analysis = concentration.performFullAnalysis();

// 生成报告
const report = concentration.generateReport();
console.log(report);
```

### 3. 风险地址分类
```javascript
import { RiskAddressClassifier } from './src/risk_Address_Classification.js';

const classifier = new RiskAddressClassifier();

// 分析单个地址
const result = await classifier.classifyAddress('0x...');

// 批量分析地址
const results = await classifier.batchClassifyAddresses(addresses);

// 生成报告
const report = classifier.generateReport(results);
```

## 📈 分析报告示例

### 持有者分析报告
```
📊 代币持有者分析报告
====================
📍 代币地址: 0xff7d6a96ae471bbcd7713af9cb1feeb16cf56b41
🔗 区块链: BSC Mainnet

💼 持有者统计
- 总持有者数量: 8,432
- 有效持有者: 8,201
- 销毁地址: 15
- 交易所地址: 186
- 锁定地址: 30

🔥 流通供应分析
- 总供应量: 1,000,000,000 ROCK
- 已销毁: 12,450,000 ROCK (1.25%)
- 流通供应: 987,550,000 ROCK (98.75%)
```

### 集中度分析报告
```
📊 代币集中度分析报告
==================
🎯 HHI指数: 1,234.56 (低风险)
📈 基尼系数: 0.45 (中等不平等)

🏆 Top持有者分析
- Top 1:  2.34% (23,400,000 ROCK)
- Top 5:  8.92% (89,200,000 ROCK)
- Top 10: 15.67% (156,700,000 ROCK)
- Top 20: 28.45% (284,500,000 ROCK)

🐋 大户地址警告
- 超过5%持有: 1个地址
- 超过2%持有: 3个地址
```

## 🔧 配置选项

### 持有者分析配置
```javascript
const config = {
    tokenAddress: "0xff7d6a96ae471bbcd7713af9cb1feeb16cf56b41",
    chainName: "bsc-mainnet",
    decimals: 18,
    enableDynamicQuery: true,
    whaleThreshold: 5.0  // 大户阈值(%)
};
```

### 风险分类阈值
```javascript
const thresholds = {
    marketMaker: {
        minTransactions: 100,
        bidirectionalRatio: 0.3,
        avgTimeInterval: 3600
    },
    teamVesting: {
        regularityScore: 0.7,
        fromContractRatio: 0.8
    },
    cex: {
        minTransactions: 50,
        depositPattern: 0.6
    }
};
```

## 📋 API依赖

- **Dune Analytics API**: 用于查询地址标签和链上数据
- **BSCScan API**: 用于获取BSC链上交易记录
- **Covalent API**: 用于获取代币持有者数据

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送 Pull Request
- 邮箱联系

---

<div align="center">
<strong>🔗 相关链接</strong><br>
<a href="./doc/">📖 详细文档</a> | 
<a href="./test/">💻 测试使用示例</a> | 
<a href="./src">📝 程序功能</a>
</div>