/**
 * @fileoverview Bedrock Token Analysis - 带完整类型提示的增强版
 * 分析Bedrock代币持有者分布和流通供应量
 */

import fs from 'fs';
import path from 'path';
import { DuneAPIHelper } from './duneAPIHelper.js';

/**
 * Bedrock Token Analysis Class
 * 分析Bedrock代币持有者分布和流通供应量的主要类
 * 
 * @class BedrockTokenAnalysis
 */
class BedrockTokenAnalysis {
    /**
     * 构造函数 - 初始化分析器
     */
    constructor() {
        /** @type {Address} 代币合约地址 */
        this.tokenAddress = "0xff7d6a96ae471bbcd7713af9cb1feeb16cf56b41";
        
        /** @type {string} 区块链网络名称 */
        this.chainName = "bsc-mainnet";
        
        /** @type {number} 代币精度 */
        this.decimals = 18;
        
        /** @type {string} 总供应量（wei格式） */
        this.totalSupply = "1000000000000000000000000000"; // 1B tokens
        
        /** @type {Set<Address>} 预定义的销毁地址集合 */
        this.burnAddresses = new Set([
            "0x0000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000dead",
            "0x0000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000002",
            "0x0000000000000000000000000000000000000003",
            // ... 其他销毁地址
        ]);
        
        /** @type {Set<Address>} 预定义的DeFi协议和锁定地址集合 */
        this.lockedAddresses = new Set([
            "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Uniswap V2 Factory
            "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap V3 Factory
            // ... 其他锁定地址
        ]);
        
        /** @type {Map<Address, LocalLabelInfo>} 交易所标签映射 */
        this.exchangeLabels = new Map();
        
        /** @type {ProcessedData|null} 处理后的数据结果 */
        this.processedData = null;
        
        /** @type {Array<RawHolderData>} 原始持有者数据 */
        this.rawHolders = [];
        
        /** @type {DuneAPIHelper} Dune API助手实例 */
        this.duneHelper = new DuneAPIHelper();
        
        /** @type {Map<Address, LocalLabelInfo|null>} 动态查询缓存 */
        this.dynamicLabels = new Map();
    }

    /**
     * 加载并处理标签数据
     * @param {string} labelFilePath - 标签文件的绝对或相对路径
     * @returns {number} 成功加载的标签数量
     * @throws {Error} 当文件读取失败或JSON解析错误时抛出
     * 
     * @example
     * const analyzer = new BedrockTokenAnalysis();
     * const count = analyzer.loadLabels('./label/bnb_labels.json');
     * console.log(`已加载 ${count} 个标签`);
     */
    loadLabels(labelFilePath) {
        try {
            /** @type {Array<Object>} 原始标签数据数组 */
            const labelData = JSON.parse(fs.readFileSync(labelFilePath, 'utf8'));
            
            labelData.forEach(label => {
                if (label.wallet_address && label.custody_owner) {
                    /** @type {LocalLabelInfo} 格式化的标签信息 */
                    const labelInfo = {
                        custodyOwner: label.custody_owner,
                        ownerKey: label.owner_key,
                        blockchain: label.blockchain,
                        firstTaggedAt: label.first_tagged_at,
                        source: 'local_data'
                    };
                    
                    this.exchangeLabels.set(
                        label.wallet_address.toLowerCase(), 
                        labelInfo
                    );
                }
            });
            
            console.log(`✅ 已加载 ${this.exchangeLabels.size} 个本地标签`);
            return this.exchangeLabels.size;
        } catch (error) {
            console.error("❌ 加载标签数据失败:", error.message);
            return 0;
        }
    }

    /**
     * 加载持有者数据
     * @param {string} holdersFilePath - 持有者数据文件路径
     * @returns {Array<RawHolderData>|null} 成功时返回持有者数据数组，失败时返回null
     * @throws {Error} 当数据格式不正确时抛出
     * 
     * @example
     * const holders = analyzer.loadHoldersData('./holders/bedrock_holders.json');
     * if (holders) {
     *     console.log(`加载了 ${holders.length} 个持有者`);
     * }
     */
    loadHoldersData(holdersFilePath) {
        try {
            /** @type {Object} API响应数据结构 */
            const holdersData = JSON.parse(fs.readFileSync(holdersFilePath, 'utf8'));
            
            if (holdersData.data && holdersData.data.items) {
                /** @type {Array<RawHolderData>} 持有者数据数组 */
                this.rawHolders = holdersData.data.items;
                console.log(`✅ 已加载 ${this.rawHolders.length} 个持有者数据`);
                return this.rawHolders;
            } else {
                throw new Error("数据格式不正确，缺少 data.items 字段");
            }
        } catch (error) {
            console.error("❌ 加载持有者数据失败:", error.message);
            return null;
        }
    }

    /**
     * 检查地址是否为销毁地址
     * @param {Address} address - 要检查的钱包地址
     * @returns {boolean} 如果是销毁地址返回true，否则返回false
     * 
     * @example
     * const isBurn = analyzer.isBurnAddress('0x000000000000000000000000000000000000dead');
     * // isBurn === true
     */
    isBurnAddress(address) {
        return this.burnAddresses.has(address.toLowerCase());
    }

    /**
     * 检查地址是否为交易所地址（多层级检查：本地标签 → 缓存 → API查询）
     * @param {Address} address - 要检查的钱包地址
     * @returns {Promise<LocalLabelInfo|null>} 交易所信息对象或null
     * 
     * @example
     * const exchangeInfo = await analyzer.isExchangeAddress('0x...');
     * if (exchangeInfo) {
     *     console.log(`发现交易所: ${exchangeInfo.custodyOwner}`);
     * }
     */
    async isExchangeAddress(address) {
        /** @type {Address} 小写格式的地址 */
        const lowerAddress = address.toLowerCase();
        
        // 1. 首先检查本地标签
        /** @type {LocalLabelInfo|undefined} 本地标签信息 */
        const localLabel = this.exchangeLabels.get(lowerAddress);
        if (localLabel) {
            console.log(`📋 本地标签匹配: ${address} -> ${localLabel.custodyOwner}`);
            return localLabel;
        }
        
        // 2. 检查动态查询缓存
        if (this.dynamicLabels.has(lowerAddress)) {
            console.log(`💾 动态缓存匹配: ${address}`);
            return this.dynamicLabels.get(lowerAddress);
        }
        
        // 3. 使用Dune API查询
        try {
            console.log(`🔍 Dune API查询: ${address}`);
            
            /** @type {Array<Object>} API返回的标签数据 */
            const labels = await this.duneHelper.queryAddressLabels(address);
            
            /** @type {Object|null} 解析后的交易所信息 */
            const exchangeInfo = this.duneHelper.parseExchangeInfo(labels);
            
            if (exchangeInfo) {
                /** @type {LocalLabelInfo} 格式化的标签信息 */
                const labelInfo = {
                    custodyOwner: exchangeInfo.exchange,
                    ownerKey: exchangeInfo.ownerKey,
                    blockchain: exchangeInfo.blockchain,
                    source: exchangeInfo.source
                };
                
                this.dynamicLabels.set(lowerAddress, labelInfo);
                console.log(`✅ 动态发现交易所: ${address} -> ${exchangeInfo.exchange}`);
                return labelInfo;
            } else {
                this.dynamicLabels.set(lowerAddress, null);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ 动态查询失败: ${address}`, error.message);
            this.dynamicLabels.set(lowerAddress, null);
            return null;
        }
    }

    /**
     * 检查地址是否为锁定地址
     * @param {Address} address - 要检查的钱包地址
     * @returns {boolean} 如果是锁定地址返回true，否则返回false
     */
    isLockedAddress(address) {
        return this.lockedAddresses.has(address.toLowerCase());
    }

    /**
     * 将wei数量转换为可读的代币数量
     * @param {string} weiAmount - wei格式的数量字符串
     * @returns {number} 转换后的代币数量
     * 
     * @example
     * const tokens = analyzer.weiToTokens('1000000000000000000'); // 1 ETH
     * // tokens === 1.0
     */
    weiToTokens(weiAmount) {
        return parseFloat(weiAmount) / Math.pow(10, this.decimals);
    }

    /**
     * 批量分析未知地址（性能优化版本）
     * @param {Array<string>} unknownAddresses - 需要分析的未知地址数组
     * @returns {Promise<Map<Address, LocalLabelInfo|null>>} 地址到分析结果的映射
     * 
     * @example
     * const results = await analyzer.batchAnalyzeUnknownAddresses(['0x...', '0x...']);
     * results.forEach((labelInfo, address) => {
     *     console.log(`${address}: ${labelInfo ? labelInfo.custodyOwner : '未知'}`);
     * });
     */
    async batchAnalyzeUnknownAddresses(unknownAddresses) {
        if (unknownAddresses.length === 0) {
            return new Map();
        }
        
        console.log(`🔄 批量分析 ${unknownAddresses.length} 个未知地址...`);
        
        // 批量查询Dune API（延迟1000ms避免速率限制）
        /** @type {Map<string, Array<Object>>} API查询结果映射 */
        const batchResults = await this.duneHelper.batchQueryAddressLabels(unknownAddresses, 1000);
        
        /** @type {Map<Address, LocalLabelInfo|null>} 分析结果映射 */
        const analysisResults = new Map();
        
        batchResults.forEach((labels, address) => {
            /** @type {Object|null} 解析后的交易所信息 */
            const exchangeInfo = this.duneHelper.parseExchangeInfo(labels);
            
            if (exchangeInfo) {
                /** @type {LocalLabelInfo} 格式化的标签信息 */
                const labelInfo = {
                    custodyOwner: exchangeInfo.exchange,
                    ownerKey: exchangeInfo.ownerKey,
                    blockchain: exchangeInfo.blockchain,
                    source: exchangeInfo.source
                };
                
                analysisResults.set(address.toLowerCase(), labelInfo);
                this.dynamicLabels.set(address.toLowerCase(), labelInfo);
            } else {
                analysisResults.set(address.toLowerCase(), null);
                this.dynamicLabels.set(address.toLowerCase(), null);
            }
        });
        
        return analysisResults;
    }

    /**
     * 处理和分类持有者数据（增强版，支持动态查询）
     * @param {boolean} [enableDynamicQuery=true] - 是否启用动态API查询
     * @returns {Promise<ProcessedData>} 完整的处理结果
     * @throws {Error} 当未加载持有者数据时抛出
     * 
     * @example
     * // 基础模式（仅本地标签）
     * const basicResult = await analyzer.processHoldersData(false);
     * 
     * // 增强模式（包含API查询）
     * const enhancedResult = await analyzer.processHoldersData(true);
     */
    async processHoldersData(enableDynamicQuery = true) {
        if (!this.rawHolders || this.rawHolders.length === 0) {
            throw new Error("请先加载持有者数据");
        }

        /** @type {ProcessedData} 初始化的结果对象 */
        const result = {
            validHolders: [],
            exchangeHolders: [],
            burnHolders: [],
            lockedHolders: [],
            statistics: {
                totalHolders: this.rawHolders.length,
                validHoldersCount: 0,
                exchangeHoldersCount: 0,
                burnHoldersCount: 0,
                lockedHoldersCount: 0,
                totalCirculatingSupply: 0,
                totalBurnedTokens: 0,
                totalExchangeBalance: 0,
                totalLockedBalance: 0,
                adjustedCirculatingSupply: 0,
                dynamicLabelsFound: 0,
                localLabelsUsed: 0
            }
        };

        /** @type {Array<{address: string, holderInfo: HolderInfo}>} 需要动态查询的地址 */
        const unknownAddresses = [];
        
        console.log("🔄 第一轮分析：检查本地标签和基础分类...");
        
        // 第一轮：基础分类和本地标签检查
        for (let index = 0; index < this.rawHolders.length; index++) {
            /** @type {RawHolderData} 当前持有者原始数据 */
            const holder = this.rawHolders[index];
            
            /** @type {Address} 小写格式地址 */
            const address = holder.address.toLowerCase();
            
            /** @type {number} 转换后的代币余额 */
            const balance = this.weiToTokens(holder.balance);
            
            /** @type {number} 排名（从1开始） */
            const rank = index + 1;

            /** @type {HolderInfo} 基础持有者信息 */
            const holderInfo = {
                rank,
                address: holder.address,
                balance,
                balanceWei: holder.balance,
                percentage: (balance / this.weiToTokens(this.totalSupply)) * 100,
                type: 'valid', // 默认值，后续会更新
                source: 'default' // 默认值，后续会更新
            };

            // 检查是否为销毁地址
            if (this.isBurnAddress(address)) {
                result.burnHolders.push({
                    ...holderInfo,
                    type: 'burn',
                    source: 'pattern_match'
                });
                result.statistics.totalBurnedTokens += balance;
                result.statistics.burnHoldersCount++;
                continue;
            }

            // 检查是否为锁定地址
            if (this.isLockedAddress(address)) {
                result.lockedHolders.push({
                    ...holderInfo,
                    type: 'locked',
                    source: 'predefined_list'
                });
                result.statistics.totalLockedBalance += balance;
                result.statistics.lockedHoldersCount++;
                continue;
            }

            // 检查本地标签
            /** @type {LocalLabelInfo|undefined} 本地标签信息 */
            const localLabel = this.exchangeLabels.get(address);
            if (localLabel) {
                result.exchangeHolders.push({
                    ...holderInfo,
                    type: 'exchange',
                    custodyOwner: localLabel.custodyOwner,
                    ownerKey: localLabel.ownerKey,
                    blockchain: localLabel.blockchain,
                    source: localLabel.source
                });
                result.statistics.totalExchangeBalance += balance;
                result.statistics.exchangeHoldersCount++;
                result.statistics.localLabelsUsed++;
                continue;
            }

            // 收集未知地址用于动态查询
            if (enableDynamicQuery) {
                unknownAddresses.push({
                    address: holder.address,
                    holderInfo: holderInfo
                });
            } else {
                // 如果不启用动态查询，直接归类为有效持有者
                result.validHolders.push({
                    ...holderInfo,
                    type: 'valid',
                    source: 'default'
                });
                result.statistics.validHoldersCount++;
            }
        }

        // 第二轮：动态查询未知地址
        if (enableDynamicQuery && unknownAddresses.length > 0) {
            console.log(`🔍 第二轮分析：动态查询 ${unknownAddresses.length} 个未知地址...`);
            
            /** @type {Array<string>} 地址字符串数组 */
            const addressList = unknownAddresses.map(item => item.address);
            
            /** @type {Map<Address, LocalLabelInfo|null>} 动态查询结果 */
            const dynamicResults = await this.batchAnalyzeUnknownAddresses(addressList);
            
            // 处理动态查询结果
            unknownAddresses.forEach(({ address, holderInfo }) => {
                /** @type {LocalLabelInfo|null} 动态发现的标签信息 */
                const dynamicLabel = dynamicResults.get(address.toLowerCase());
                
                if (dynamicLabel) {
                    // 发现新的交易所标签
                    result.exchangeHolders.push({
                        ...holderInfo,
                        type: 'exchange',
                        custodyOwner: dynamicLabel.custodyOwner,
                        ownerKey: dynamicLabel.ownerKey,
                        blockchain: dynamicLabel.blockchain,
                        source: dynamicLabel.source
                    });
                    result.statistics.totalExchangeBalance += holderInfo.balance;
                    result.statistics.exchangeHoldersCount++;
                    result.statistics.dynamicLabelsFound++;
                } else {
                    // 确认为有效持有者
                    result.validHolders.push({
                        ...holderInfo,
                        type: 'valid',
                        source: 'dynamic_verified'
                    });
                    result.statistics.validHoldersCount++;
                }
            });
        }

        // 计算最终统计数据
        /** @type {number} 总供应量（代币单位） */
        const totalSupplyTokens = this.weiToTokens(this.totalSupply);
        result.statistics.totalCirculatingSupply = totalSupplyTokens;
        
        // 调整后的流通供应量 = 总供应量 - 销毁代币 - 锁定代币
        result.statistics.adjustedCirculatingSupply = 
            totalSupplyTokens - 
            result.statistics.totalBurnedTokens - 
            result.statistics.totalLockedBalance;

        this.processedData = result;
        
        // 输出查询统计信息
        /** @type {Object} API查询统计 */
        const queryStats = this.duneHelper.getQueryStats();
        console.log(`\n📊 查询统计:`);
        console.log(`   - 本地标签使用: ${result.statistics.localLabelsUsed}`);
        console.log(`   - 动态标签发现: ${result.statistics.dynamicLabelsFound}`);
        console.log(`   - 查询缓存大小: ${queryStats.cacheSize}`);
        console.log(`   - 剩余查询配额: ${queryStats.rateLimitRemaining}/分钟`);
        
        return result;
    }

    /**
     * 生成分析报告（增强版）
     * @returns {string} 格式化的报告
     */
    generateReport() {
        if (!this.processedData) {
            throw new Error("请先处理持有者数据");
        }

        const { statistics, validHolders, exchangeHolders, burnHolders, lockedHolders } = this.processedData;
        
        let report = `
🚀 Bedrock Token (BR) 持有者分析报告 (增强版)
=============================================

📊 基本信息
- 代币地址: ${this.tokenAddress}
- 链名称: ${this.chainName}
- 总供应量: ${(statistics.totalCirculatingSupply / 1e6).toFixed(2)}M BR

📈 持有者统计
- 总持有者数量: ${statistics.totalHolders}
- 有效持有者: ${statistics.validHoldersCount} (${((statistics.validHoldersCount / statistics.totalHolders) * 100).toFixed(2)}%)
- 交易所持有者: ${statistics.exchangeHoldersCount} (${((statistics.exchangeHoldersCount / statistics.totalHolders) * 100).toFixed(2)}%)
- 销毁地址: ${statistics.burnHoldersCount} (${((statistics.burnHoldersCount / statistics.totalHolders) * 100).toFixed(2)}%)
- 锁定地址: ${statistics.lockedHoldersCount} (${((statistics.lockedHoldersCount / statistics.totalHolders) * 100).toFixed(2)}%)

🔍 标签分析统计
- 本地标签匹配: ${statistics.localLabelsUsed}
- 动态查询发现: ${statistics.dynamicLabelsFound}
- 总标签覆盖率: ${(((statistics.localLabelsUsed + statistics.dynamicLabelsFound) / statistics.totalHolders) * 100).toFixed(2)}%

💰 代币分布
- 总流通供应量: ${(statistics.totalCirculatingSupply / 1e6).toFixed(2)}M BR
- 已销毁代币: ${(statistics.totalBurnedTokens / 1e6).toFixed(2)}M BR (${((statistics.totalBurnedTokens / statistics.totalCirculatingSupply) * 100).toFixed(2)}%)
- 交易所余额: ${(statistics.totalExchangeBalance / 1e6).toFixed(2)}M BR (${((statistics.totalExchangeBalance / statistics.totalCirculatingSupply) * 100).toFixed(2)}%)
- 锁定余额: ${(statistics.totalLockedBalance / 1e6).toFixed(2)}M BR (${((statistics.totalLockedBalance / statistics.totalCirculatingSupply) * 100).toFixed(2)}%)

🔥 调整后流通供应量
- 调整后供应量: ${(statistics.adjustedCirculatingSupply / 1e6).toFixed(2)}M BR
- 调整比例: ${((statistics.adjustedCirculatingSupply / statistics.totalCirculatingSupply) * 100).toFixed(2)}%

`;

        // 前10名有效持有者
        if (validHolders.length > 0) {
            report += `\n🏆 前10名有效持有者\n`;
            report += `排名\t地址\t\t\t\t\t余额(M BR)\t占比\t来源\n`;
            report += `${'='.repeat(90)}\n`;
            
            validHolders.slice(0, 10).forEach(holder => {
                const sourceLabel = holder.source === 'dynamic_verified' ? '🔍' : '📋';
                report += `${holder.rank}\t${holder.address.substring(0, 8)}...${holder.address.substring(38)}\t${(holder.balance / 1e6).toFixed(2)}\t\t${holder.percentage.toFixed(4)}%\t${sourceLabel}\n`;
            });
        }

        // 交易所持有者（按来源分类）
        if (exchangeHolders.length > 0) {
            report += `\n🏢 交易所持有者 (${exchangeHolders.length}个)\n`;
            report += `排名\t交易所\t\t\t余额(M BR)\t占比\t来源\n`;
            report += `${'='.repeat(80)}\n`;
            
            exchangeHolders.forEach(holder => {
                const sourceLabel = holder.source === 'local_data' ? '📋' : 
                                   holder.source === 'dune_api' ? '🔍' : 
                                   holder.source === 'mock_data' ? '🎭' : '❓';
                report += `${holder.rank}\t${holder.custodyOwner}\t\t${(holder.balance / 1e6).toFixed(2)}\t\t${holder.percentage.toFixed(4)}%\t${sourceLabel}\n`;
            });
            
            report += `\n图例: 📋 本地数据 | 🔍 Dune API | 🎭 Mock数据\n`;
        }

        // 销毁地址
        if (burnHolders.length > 0) {
            report += `\n🔥 销毁地址 (${burnHolders.length}个)\n`;
            report += `排名\t地址\t\t\t\t\t余额(M BR)\t占比\n`;
            report += `${'='.repeat(80)}\n`;
            
            burnHolders.forEach(holder => {
                report += `${holder.rank}\t${holder.address.substring(0, 8)}...${holder.address.substring(38)}\t${(holder.balance / 1e6).toFixed(2)}\t\t${holder.percentage.toFixed(4)}%\n`;
            });
        }

        return report;
    }

    /**
     * 保存分析结果（增强版）
     * @param {string} outputDir - 输出目录
     */
    saveResults(outputDir = 'analysis-results') {
        if (!this.processedData) {
            throw new Error("请先处理持有者数据");
        }

        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // 保存处理后的数据（包含查询统计）
        const enhancedData = {
            ...this.processedData,
            queryStats: this.duneHelper.getQueryStats(),
            dynamicLabels: Array.from(this.dynamicLabels.entries()).map(([address, label]) => ({
                address,
                label
            }))
        };
        
        const dataFileName = `bedrock-enhanced-analysis-${timestamp}.json`;
        const dataFilePath = path.join(outputDir, dataFileName);
        fs.writeFileSync(dataFilePath, JSON.stringify(enhancedData, null, 2), 'utf8');

        // 保存分析报告
        const reportFileName = `bedrock-enhanced-report-${timestamp}.txt`;
        const reportFilePath = path.join(outputDir, reportFileName);
        fs.writeFileSync(reportFilePath, this.generateReport(), 'utf8');

        // 保存CSV格式的有效持有者数据
        const csvFileName = `bedrock-valid-holders-enhanced-${timestamp}.csv`;
        const csvFilePath = path.join(outputDir, csvFileName);
        this.saveValidHoldersCSV(csvFilePath);

        // 保存动态发现的标签
        const labelsFileName = `bedrock-dynamic-labels-${timestamp}.json`;
        const labelsFilePath = path.join(outputDir, labelsFileName);
        const dynamicLabelsData = {
            totalDynamicLabels: this.dynamicLabels.size,
            labels: Array.from(this.dynamicLabels.entries()).map(([address, label]) => ({
                address,
                label
            })),
            queryStats: this.duneHelper.getQueryStats()
        };
        fs.writeFileSync(labelsFilePath, JSON.stringify(dynamicLabelsData, null, 2), 'utf8');

        console.log(`\n📁 增强分析结果已保存到 ${outputDir}/ 目录:`);
        console.log(`   - 完整数据: ${dataFileName}`);
        console.log(`   - 分析报告: ${reportFileName}`);
        console.log(`   - 有效持有者CSV: ${csvFileName}`);
        console.log(`   - 动态标签: ${labelsFileName}`);

        return {
            dataFilePath,
            reportFilePath,
            csvFilePath,
            labelsFilePath
        };
    }

    /**
     * 保存有效持有者为CSV格式（增强版）
     * @param {string} filePath - 文件路径
     */
    saveValidHoldersCSV(filePath) {
        if (!this.processedData || !this.processedData.validHolders) {
            throw new Error("没有有效持有者数据");
        }

        const headers = 'Rank,Address,Balance_BR,Balance_Wei,Percentage,Source\n';
        const rows = this.processedData.validHolders.map(holder => 
            `${holder.rank},${holder.address},${holder.balance},${holder.balanceWei},${holder.percentage},${holder.source}`
        ).join('\n');

        fs.writeFileSync(filePath, headers + rows, 'utf8');
    }

    /**
     * 获取持有者集中度分析
     * @returns {object} 集中度分析数据
     */
    getConcentrationAnalysis() {
        if (!this.processedData) {
            throw new Error("请先处理持有者数据");
        }

        const { validHolders, statistics } = this.processedData;
        
        // 计算前N名持有者的占比
        const concentrationLevels = [1, 5, 10, 20, 50, 100];
        const concentration = {};

        concentrationLevels.forEach(n => {
            if (validHolders.length >= n) {
                const topNBalance = validHolders.slice(0, n)
                    .reduce((sum, holder) => sum + holder.balance, 0);
                const percentage = (topNBalance / statistics.adjustedCirculatingSupply) * 100;
                concentration[`top${n}`] = {
                    balance: topNBalance,
                    percentage: percentage.toFixed(4)
                };
            }
        });

        return concentration;
    }

    /**
     * 获取动态查询统计
     * @returns {object} 动态查询统计信息
     */
    getDynamicQueryStats() {
        return {
            duneAPIStats: this.duneHelper.getQueryStats(),
            dynamicLabelsCount: this.dynamicLabels.size,
            dynamicLabels: Array.from(this.dynamicLabels.entries())
        };
    }
}

/**
 * 主函数 - 执行完整的代币分析（增强版）
 */
async function main() {
    try {
        console.log("🚀 开始Bedrock代币增强分析...\n");

        const analyzer = new BedrockTokenAnalysis();

        // 加载标签数据
        console.log("📋 加载本地标签数据...");
        analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
        analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');

        // 加载持有者数据
        console.log("\n👥 加载持有者数据...");
        const holdersData = analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');
        
        if (!holdersData) {
            throw new Error("无法加载持有者数据");
        }

        // 处理数据（启用动态查询）
        console.log("\n🔄 处理和分析数据（启用动态查询）...");
        const processedData = await analyzer.processHoldersData(true);

        // 生成并显示报告
        console.log("\n📊 生成增强分析报告...");
        const report = analyzer.generateReport();
        console.log(report);

        // 集中度分析
        console.log("\n📈 持有者集中度分析:");
        const concentration = analyzer.getConcentrationAnalysis();
        Object.entries(concentration).forEach(([key, value]) => {
            console.log(`   ${key}: ${(value.balance / 1e6).toFixed(2)}M BR (${value.percentage}%)`);
        });

        // 动态查询统计
        console.log("\n🔍 动态查询统计:");
        const dynamicStats = analyzer.getDynamicQueryStats();
        console.log(`   - 动态标签发现: ${dynamicStats.dynamicLabelsCount}`);
        console.log(`   - API查询统计: ${JSON.stringify(dynamicStats.duneAPIStats, null, 2)}`);

        // 保存结果
        console.log("\n💾 保存增强分析结果...");
        const savedFiles = analyzer.saveResults();

        console.log("\n✅ 增强分析完成!");
        return processedData;

    } catch (error) {
        console.error("❌ 分析过程中出现错误:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();

export { BedrockTokenAnalysis, main };
