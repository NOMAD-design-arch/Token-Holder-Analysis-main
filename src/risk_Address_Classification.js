import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { DuneAPIHelper } from './utils/duneAPIHelper.js';

// 加载环境变量
dotenv.config();

/**
 * 风险地址分类器
 * 支持四种分类：Team/Vesting、Market Makers、CEX、Unknown
 * 支持分析holders目录中的持有者地址
 */
export class RiskAddressClassifier {
    constructor() {
        this.bscApiKey = process.env.Bscscan_API_KEY;
        this.duneHelper = new DuneAPIHelper();
        
        // 本地标签数据缓存
        this.localLabels = new Map();
        this.loadLocalLabels();
        
        // 分类阈值配置
        this.thresholds = {
            marketMaker: {
                minTransactions: 100,        // 最小交易数量
                minDailyVolume: 10000,       // 最小日交易量(USD)
                bidirectionalRatio: 0.3,     // 双向交易比例阈值
                avgTimeInterval: 3600,       // 平均交易间隔(秒)，1小时
                uniqueTokens: 5              // 最小交易token种类数
            },
            teamVesting: {
                minAmount: 1000,             // 最小单次转账金额(USD)
                regularityScore: 0.7,        // 规律性得分阈值
                fromContractRatio: 0.8,      // 来自合约的交易比例
                scheduledPattern: true       // 是否有定期模式
            },
            cex: {
                minTransactions: 50,         // 最小交易数量
                depositPattern: 0.6,         // 存款模式得分阈值
                knownAddressMatch: true      // 是否匹配已知地址
            }
        };
        
        console.log('🚀 风险地址分类器初始化完成');
    }

    /**
     * 加载本地标签数据
     */
    loadLocalLabels() {
        try {
            const labelDir = './label';
            const files = fs.readdirSync(labelDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(labelDir, file);
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    
                    data.forEach(item => {
                        if (item.wallet_address) {
                            this.localLabels.set(item.wallet_address.toLowerCase(), {
                                ownerKey: item.owner_key,
                                custodyOwner: item.custody_owner,
                                blockchain: item.blockchain,
                                source: 'local'
                            });
                        }
                    });
                }
            }
            
            console.log(`📂 加载本地标签数据: ${this.localLabels.size} 个地址`);
        } catch (error) {
            console.error('❌ 加载本地标签数据失败:', error.message);
        }
    }

    /**
     * 检查本地标签
     * @param {string} address - 钱包地址
     * @returns {Object|null} 标签信息
     */
    checkLocalLabels(address) {
        const normalizedAddress = address.toLowerCase();
        return this.localLabels.get(normalizedAddress) || null;
    }

    /**
     * 使用Dune API查询地址标签
     * @param {string} address - 钱包地址
     * @returns {Promise<Array>} 标签数据
     */
    async queryDuneLabels(address) {
        try {
            const labels = await this.duneHelper.queryAddressLabels(address);
            return labels;
        } catch (error) {
            console.error(`❌ Dune API查询失败 (${address}):`, error.message);
            return [];
        }
    }

    /**
     * 调用BSCScan API获取BEP-20代币交易记录
     * @param {string} address - 钱包地址
     * @param {number} limit - 获取交易数量限制
     * @returns {Promise<Array>} 交易记录
     */
    async getBSCTransactions(address, limit = 1000) {
        try {
            const url = 'https://api.bscscan.com/api';
            const params = {
                module: 'account',
                action: 'tokentx',
                address: address,
                page: 1,
                offset: limit,
                startblock: 0,
                endblock: 999999999,
                sort: 'desc',
                apikey: this.bscApiKey
            };

            console.log(`🔍 获取BSC交易记录: ${address} (最新${limit}笔)`);
            
            const response = await axios.get(url, { params });
            
            if (response.data.status === '1') {
                console.log(`✅ 获取到 ${response.data.result.length} 笔交易记录`);
                return response.data.result;
            } else {
                console.log(`⚠️  API返回错误: ${response.data.message}`);
                return [];
            }
        } catch (error) {
            console.error(`❌ BSCScan API调用失败:`, error.message);
            return [];
        }
    }

    /**
     * 分析Market Maker模式
     * @param {Array} transactions - 交易记录
     * @param {string} address - 地址
     * @returns {Object} 分析结果
     */
    analyzeMarketMakerPattern(transactions, address) {
        if (transactions.length < this.thresholds.marketMaker.minTransactions) {
            return { isMarketMaker: false, score: 0, reason: '交易数量不足' };
        }

        const normalizedAddress = address.toLowerCase();
        
        // 计算双向交易比例
        const incomingTxs = transactions.filter(tx => tx.to.toLowerCase() === normalizedAddress);
        const outgoingTxs = transactions.filter(tx => tx.from.toLowerCase() === normalizedAddress);
        const bidirectionalRatio = Math.min(incomingTxs.length, outgoingTxs.length) / Math.max(incomingTxs.length, outgoingTxs.length);
        
        // 计算时间间隔分布
        const timestamps = transactions.map(tx => parseInt(tx.timeStamp)).sort((a, b) => b - a);
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i-1] - timestamps[i]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // 计算唯一代币数量
        const uniqueTokens = new Set(transactions.map(tx => tx.contractAddress)).size;
        
        // 计算日交易频率
        const dayMs = 24 * 60 * 60 * 1000;
        const firstDay = Math.floor(timestamps[timestamps.length - 1] * 1000 / dayMs);
        const lastDay = Math.floor(timestamps[0] * 1000 / dayMs);
        const activeDays = lastDay - firstDay + 1;
        const avgDailyTxs = transactions.length / Math.max(activeDays, 1);
        
        // 综合评分
        let score = 0;
        const factors = [];
        
        // 双向交易比例评分
        if (bidirectionalRatio >= this.thresholds.marketMaker.bidirectionalRatio) {
            score += 0.3;
            factors.push(`双向交易比例: ${(bidirectionalRatio * 100).toFixed(1)}%`);
        }
        
        // 交易频率评分
        if (avgInterval <= this.thresholds.marketMaker.avgTimeInterval) {
            score += 0.25;
            factors.push(`高频交易: 平均间隔${Math.round(avgInterval/60)}分钟`);
        }
        
        // 代币种类评分
        if (uniqueTokens >= this.thresholds.marketMaker.uniqueTokens) {
            score += 0.2;
            factors.push(`多代币交易: ${uniqueTokens}种代币`);
        }
        
        // 每日交易量评分
        if (avgDailyTxs >= 10) {
            score += 0.25;
            factors.push(`日均交易量: ${avgDailyTxs.toFixed(1)}笔`);
        }

        return {
            isMarketMaker: score >= 0.7,
            score: score,
            factors: factors,
            stats: {
                bidirectionalRatio: bidirectionalRatio,
                avgInterval: avgInterval,
                uniqueTokens: uniqueTokens,
                avgDailyTxs: avgDailyTxs,
                totalTransactions: transactions.length
            }
        };
    }

    /**
     * 分析Team/Vesting模式
     * @param {Array} transactions - 交易记录
     * @param {string} address - 地址
     * @returns {Object} 分析结果
     */
    analyzeTeamVestingPattern(transactions, address) {
        const normalizedAddress = address.toLowerCase();
        const outgoingTxs = transactions.filter(tx => tx.from.toLowerCase() === normalizedAddress);
        
        if (outgoingTxs.length < 10) {
            return { isTeamVesting: false, score: 0, reason: '转出交易数量不足' };
        }

        // 检查是否来自合约地址
        const contractTxs = outgoingTxs.filter(tx => {
            return tx.from.length === 42 && tx.from.startsWith('0x');
        });
        const fromContractRatio = contractTxs.length / outgoingTxs.length;
        
        // 分析转账金额模式
        const amounts = outgoingTxs.map(tx => parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || 18)));
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        
        // 检查时间规律性
        const timestamps = outgoingTxs.map(tx => parseInt(tx.timeStamp)).sort();
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        // 计算间隔的标准差来判断规律性
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        const regularityScore = 1 - Math.min(stdDev / avgInterval, 1);
        
        // 检查是否有周期性模式
        const weeklyPattern = this.detectPeriodicPattern(timestamps, 7 * 24 * 3600);
        const monthlyPattern = this.detectPeriodicPattern(timestamps, 30 * 24 * 3600);
        
        let score = 0;
        const factors = [];
        
        // 来自合约比例评分
        if (fromContractRatio >= this.thresholds.teamVesting.fromContractRatio) {
            score += 0.4;
            factors.push(`合约转出: ${(fromContractRatio * 100).toFixed(1)}%`);
        }
        
        // 规律性评分
        if (regularityScore >= this.thresholds.teamVesting.regularityScore) {
            score += 0.3;
            factors.push(`转账规律性: ${(regularityScore * 100).toFixed(1)}%`);
        }
        
        // 周期性模式评分
        if (weeklyPattern.score > 0.6 || monthlyPattern.score > 0.6) {
            score += 0.3;
            factors.push(`定期模式: ${weeklyPattern.score > monthlyPattern.score ? '周期性' : '月度性'}`);
        }

        return {
            isTeamVesting: score >= 0.7,
            score: score,
            factors: factors,
            stats: {
                fromContractRatio: fromContractRatio,
                regularityScore: regularityScore,
                avgAmount: avgAmount,
                avgInterval: avgInterval,
                weeklyPattern: weeklyPattern.score,
                monthlyPattern: monthlyPattern.score,
                totalOutgoing: outgoingTxs.length
            }
        };
    }

    /**
     * 检测周期性模式
     * @param {Array} timestamps - 时间戳数组
     * @param {number} period - 周期（秒）
     * @returns {Object} 周期性分析结果
     */
    detectPeriodicPattern(timestamps, period) {
        if (timestamps.length < 3) return { score: 0, pattern: null };
        
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        // 检查间隔是否接近目标周期
        const closeToPattern = intervals.filter(interval => 
            Math.abs(interval - period) < period * 0.2
        ).length;
        
        const score = closeToPattern / intervals.length;
        
        return {
            score: score,
            pattern: score > 0.5 ? `${period / (24 * 3600)}天周期` : null
        };
    }

    /**
     * 分析CEX模式
     * @param {Array} transactions - 交易记录
     * @param {Object} labelInfo - 标签信息
     * @param {string} address - 地址
     * @returns {Object} 分析结果
     */
    analyzeCEXPattern(transactions, labelInfo, address) {
        let score = 0;
        const factors = [];
        
        // 检查已知地址匹配
        if (labelInfo && labelInfo.custodyOwner) {
            score += 0.6;
            factors.push(`已知交易所: ${labelInfo.custodyOwner}`);
        }
        
        if (transactions.length < this.thresholds.cex.minTransactions) {
            return { 
                isCEX: score >= 0.6, 
                score: score, 
                factors: factors,
                reason: score < 0.6 ? '交易数量不足且非已知交易所地址' : undefined
            };
        }

        const normalizedAddress = address.toLowerCase();
        
        // 分析存款模式
        const incomingTxs = transactions.filter(tx => tx.to.toLowerCase() === normalizedAddress);
        const outgoingTxs = transactions.filter(tx => tx.from.toLowerCase() === normalizedAddress);
        
        const depositRatio = incomingTxs.length / (incomingTxs.length + outgoingTxs.length);
        
        // 分析交易对手方多样性
        const uniqueCounterparties = new Set([
            ...incomingTxs.map(tx => tx.from),
            ...outgoingTxs.map(tx => tx.to)
        ]).size;
        
        // 分析代币种类多样性
        const uniqueTokens = new Set(transactions.map(tx => tx.contractAddress)).size;
        
        // 存款模式评分
        if (depositRatio >= this.thresholds.cex.depositPattern) {
            score += 0.2;
            factors.push(`存款导向: ${(depositRatio * 100).toFixed(1)}%`);
        }
        
        // 交易对手方多样性评分
        if (uniqueCounterparties >= 50) {
            score += 0.1;
            factors.push(`多样化交易对手: ${uniqueCounterparties}个`);
        }
        
        // 代币多样性评分
        if (uniqueTokens >= 10) {
            score += 0.1;
            factors.push(`多代币支持: ${uniqueTokens}种代币`);
        }

        return {
            isCEX: score >= 0.6,
            score: score,
            factors: factors,
            stats: {
                depositRatio: depositRatio,
                uniqueCounterparties: uniqueCounterparties,
                uniqueTokens: uniqueTokens,
                totalTransactions: transactions.length
            }
        };
    }

    /**
     * 分类单个地址
     * @param {string} address - 钱包地址
     * @returns {Promise<Object>} 分类结果
     */
    async classifyAddress(address) {
        console.log(`\n🔍 开始分析地址: ${address}`);
        
        const result = {
            address: address,
            classification: 'Unknown',
            confidence: 0,
            details: {},
            timestamp: new Date().toISOString()
        };

        try {
            // 1. 检查本地标签
            const localLabel = this.checkLocalLabels(address);
            if (localLabel) {
                console.log(`📂 本地标签匹配: ${localLabel.custodyOwner || localLabel.ownerKey}`);
                result.details.localLabel = localLabel;
            }

            // 2. 查询Dune标签
            const duneLabels = await this.queryDuneLabels(address);
            if (duneLabels.length > 0) {
                console.log(`🔗 Dune标签数量: ${duneLabels.length}`);
                result.details.duneLabels = duneLabels;
            }

            // 合并标签信息
            const labelInfo = localLabel || (duneLabels.length > 0 ? duneLabels[0] : null);

            // 3. 获取BSC交易数据
            const transactions = await this.getBSCTransactions(address);
            if (transactions.length === 0) {
                console.log(`⚠️  未找到交易数据，仅基于标签进行分类`);
                
                if (labelInfo && labelInfo.custodyOwner) {
                    result.classification = 'CEX';
                    result.confidence = 0.8;
                    result.details.reason = '基于已知标签识别';
                } else {
                    result.classification = 'Unknown';
                    result.confidence = 0;
                    result.details.reason = '无交易数据且无已知标签';
                }
                
                return result;
            }

            // 4. 进行模式分析
            console.log(`📊 开始模式分析...`);
            
            const cexAnalysis = this.analyzeCEXPattern(transactions, labelInfo, address);
            result.details.cexAnalysis = cexAnalysis;
            
            const mmAnalysis = this.analyzeMarketMakerPattern(transactions, address);
            result.details.marketMakerAnalysis = mmAnalysis;
            
            const vestingAnalysis = this.analyzeTeamVestingPattern(transactions, address);
            result.details.vestingAnalysis = vestingAnalysis;

            // 5. 确定最终分类
            const classifications = [];
            
            if (cexAnalysis.isCEX) {
                classifications.push({ type: 'CEX', score: cexAnalysis.score });
            }
            if (mmAnalysis.isMarketMaker) {
                classifications.push({ type: 'Market Makers', score: mmAnalysis.score });
            }
            if (vestingAnalysis.isTeamVesting) {
                classifications.push({ type: 'Team/Vesting', score: vestingAnalysis.score });
            }

            // 选择得分最高的分类
            if (classifications.length > 0) {
                const bestMatch = classifications.sort((a, b) => b.score - a.score)[0];
                result.classification = bestMatch.type;
                result.confidence = bestMatch.score;
            } else {
                result.classification = 'Unknown';
                result.confidence = 0;
                result.details.reason = '未匹配任何已知模式';
            }

            console.log(`✅ 分类完成: ${result.classification} (置信度: ${(result.confidence * 100).toFixed(1)}%)`);
            
        } catch (error) {
            console.error(`❌ 分类过程中出现错误:`, error.message);
            result.details.error = error.message;
        }

        return result;
    }

    /**
     * 批量分类地址
     * @param {Array<string>} addresses - 地址数组
     * @returns {Promise<Array>} 分类结果数组
     */
    async batchClassifyAddresses(addresses) {
        console.log(`🚀 开始批量分类 ${addresses.length} 个地址...`);
        
        const results = [];
        const batchSize = 5;
        
        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            console.log(`\n📦 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(addresses.length/batchSize)}`);
            
            const batchPromises = batch.map(address => this.classifyAddress(address));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            if (i + batchSize < addresses.length) {
                console.log(`⏱️  等待2秒后处理下一批次...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        return results;
    }

    /**
     * 生成分类报告
     * @param {Array} results - 分类结果数组
     * @returns {Object} 统计报告
     */
    generateReport(results) {
        const report = {
            total: results.length,
            classifications: {
                'CEX': 0,
                'Market Makers': 0,
                'Team/Vesting': 0,
                'Unknown': 0
            },
            highConfidence: 0,
            mediumConfidence: 0,
            lowConfidence: 0,
            details: results
        };

        results.forEach(result => {
            report.classifications[result.classification]++;
            
            if (result.confidence >= 0.8) {
                report.highConfidence++;
            } else if (result.confidence >= 0.5) {
                report.mediumConfidence++;
            } else {
                report.lowConfidence++;
            }
        });

        return report;
    }

    /**
     * 导出结果到文件
     * @param {Object} report - 分类报告
     * @param {string} filename - 文件名
     */
    async exportResults(report, filename = 'risk_classification_results.json') {
        try {
            const outputDir = './results/classification-results';
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const outputPath = path.join(outputDir, filename);
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
            
            console.log(`📄 结果已导出到: ${outputPath}`);
        } catch (error) {
            console.error('❌ 导出结果失败:', error.message);
        }
    }

    /**
     * 加载holders目录中的持有者数据
     * @returns {Array} 持有者地址数组
     */
    loadHoldersData() {
        try {
            const holdersDir = './holders';
            if (!fs.existsSync(holdersDir)) {
                console.log(`⚠️  holders目录不存在: ${holdersDir}`);
                return [];
            }

            const files = fs.readdirSync(holdersDir);
            const allHolders = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(holdersDir, file);
                    console.log(`📂 读取持有者文件: ${file}`);
                    
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    
                    if (data.data && data.data.items) {
                        data.data.items.forEach(item => {
                            if (item.address) {
                                const holderInfo = {
                                    address: item.address,
                                    balance: item.balance,
                                    tokenName: item.contract_name,
                                    tokenSymbol: item.contract_ticker_symbol,
                                    contractAddress: item.contract_address,
                                    decimals: item.contract_decimals,
                                    blockHeight: item.block_height,
                                    chainName: data.data.chain_name,
                                    updatedAt: data.data.updated_at,
                                    holdingPercentage: item.total_supply ? 
                                        (parseFloat(item.balance) / parseFloat(item.total_supply) * 100).toFixed(4) : '0'
                                };
                                
                                allHolders.push(holderInfo);
                            }
                        });
                    }
                }
            }
            
            console.log(`📊 加载完成，共找到 ${allHolders.length} 个持有者地址`);
            return allHolders;
            
        } catch (error) {
            console.error('❌ 加载holders数据失败:', error.message);
            return [];
        }
    }

    /**
     * 分析holders目录中的持有者地址
     * @param {Object} options - 分析选项
     * @returns {Promise<Object>} 分析报告
     */
    async analyzeHolders(options = {}) {
        const {
            minHoldingPercentage = 0,
            topN = 0,
            includeBalance = true,
            sortBy = 'balance'
        } = options;

        console.log('\n🏦 开始分析holders目录中的持有者地址...');
        console.log(`📋 分析配置: 最小持有占比=${minHoldingPercentage}%, 前${topN || '全部'}个地址, 排序=${sortBy}`);
        
        try {
            const holdersData = this.loadHoldersData();
            if (holdersData.length === 0) {
                return {
                    error: 'No holders data found',
                    totalHolders: 0,
                    analysisResults: []
                };
            }

            let filteredHolders = holdersData.filter(holder => 
                parseFloat(holder.holdingPercentage) >= minHoldingPercentage
            );

            if (sortBy === 'balance') {
                filteredHolders.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
            } else if (sortBy === 'holdingPercentage') {
                filteredHolders.sort((a, b) => parseFloat(b.holdingPercentage) - parseFloat(a.holdingPercentage));
            }

            if (topN > 0) {
                filteredHolders = filteredHolders.slice(0, topN);
            }

            console.log(`🎯 筛选后待分析地址数: ${filteredHolders.length}`);

            const addresses = filteredHolders.map(holder => holder.address);
            const classificationResults = await this.batchClassifyAddresses(addresses);

            const enhancedResults = classificationResults.map((result, index) => {
                const holderInfo = filteredHolders[index];
                return {
                    ...result,
                    holderInfo: includeBalance ? holderInfo : {
                        tokenName: holderInfo.tokenName,
                        tokenSymbol: holderInfo.tokenSymbol,
                        holdingPercentage: holderInfo.holdingPercentage,
                        chainName: holderInfo.chainName
                    }
                };
            });

            const classificationReport = this.generateReport(classificationResults);
            
            const holdersAnalysisReport = {
                ...classificationReport,
                totalHoldersFound: holdersData.length,
                totalHoldersAnalyzed: filteredHolders.length,
                analysisConfig: options,
                tokenInfo: this.extractTokenInfo(holdersData),
                holdingDistribution: this.analyzeHoldingDistribution(filteredHolders),
                riskDistribution: this.analyzeRiskDistribution(enhancedResults),
                topRiskHolders: this.getTopRiskHolders(enhancedResults),
                details: enhancedResults
            };

            console.log('\n📊 持有者风险分析完成！');
            console.log(`🏦 代币信息: ${holdersAnalysisReport.tokenInfo.map(t => `${t.name}(${t.symbol})`).join(', ')}`);
            console.log(`📈 风险分布: CEX(${classificationReport.classifications.CEX}), MM(${classificationReport.classifications['Market Makers']}), Vesting(${classificationReport.classifications['Team/Vesting']}), Unknown(${classificationReport.classifications.Unknown})`);

            return holdersAnalysisReport;

        } catch (error) {
            console.error('❌ 持有者分析失败:', error.message);
            return {
                error: error.message,
                totalHolders: 0,
                analysisResults: []
            };
        }
    }

    /**
     * 提取代币信息
     * @param {Array} holdersData - 持有者数据
     * @returns {Array} 代币信息列表
     */
    extractTokenInfo(holdersData) {
        const tokensMap = new Map();
        
        holdersData.forEach(holder => {
            const key = holder.contractAddress;
            if (!tokensMap.has(key)) {
                tokensMap.set(key, {
                    name: holder.tokenName,
                    symbol: holder.tokenSymbol,
                    contractAddress: holder.contractAddress,
                    decimals: holder.decimals,
                    chainName: holder.chainName
                });
            }
        });
        
        return Array.from(tokensMap.values());
    }

    /**
     * 分析持有分布
     * @param {Array} holders - 持有者数据
     * @returns {Object} 持有分布统计
     */
    analyzeHoldingDistribution(holders) {
        const distribution = {
            large: 0,    // >10%
            medium: 0,   // 1-10%
            small: 0,    // 0.1-1%
            micro: 0     // <0.1%
        };

        holders.forEach(holder => {
            const percentage = parseFloat(holder.holdingPercentage);
            if (percentage >= 10) {
                distribution.large++;
            } else if (percentage >= 1) {
                distribution.medium++;
            } else if (percentage >= 0.1) {
                distribution.small++;
            } else {
                distribution.micro++;
            }
        });

        return distribution;
    }

    /**
     * 分析风险分布
     * @param {Array} results - 分析结果
     * @returns {Object} 风险分布统计
     */
    analyzeRiskDistribution(results) {
        const riskByHolding = {
            large: { CEX: 0, 'Market Makers': 0, 'Team/Vesting': 0, Unknown: 0 },
            medium: { CEX: 0, 'Market Makers': 0, 'Team/Vesting': 0, Unknown: 0 },
            small: { CEX: 0, 'Market Makers': 0, 'Team/Vesting': 0, Unknown: 0 },
            micro: { CEX: 0, 'Market Makers': 0, 'Team/Vesting': 0, Unknown: 0 }
        };

        results.forEach(result => {
            const percentage = parseFloat(result.holderInfo.holdingPercentage);
            const classification = result.classification;
            
            if (percentage >= 10) {
                riskByHolding.large[classification]++;
            } else if (percentage >= 1) {
                riskByHolding.medium[classification]++;
            } else if (percentage >= 0.1) {
                riskByHolding.small[classification]++;
            } else {
                riskByHolding.micro[classification]++;
            }
        });

        return riskByHolding;
    }

    /**
     * 获取高风险持有者
     * @param {Array} results - 分析结果
     * @returns {Array} 高风险持有者列表
     */
    getTopRiskHolders(results) {
        const riskScores = {
            'CEX': 1,
            'Team/Vesting': 2,
            'Market Makers': 3,
            'Unknown': 4
        };

        return results
            .filter(result => result.classification !== 'CEX')
            .map(result => ({
                address: result.address,
                classification: result.classification,
                confidence: result.confidence,
                holdingPercentage: result.holderInfo.holdingPercentage,
                tokenSymbol: result.holderInfo.tokenSymbol,
                riskScore: riskScores[result.classification] * parseFloat(result.holderInfo.holdingPercentage)
            }))
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 10);
    }
} 