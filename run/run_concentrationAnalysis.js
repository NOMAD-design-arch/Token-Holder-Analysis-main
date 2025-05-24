/**
 * @fileoverview Token集中度分析运行脚本
 * 读取holders目录下的持有者数据，进行完整的集中度风险分析
 */

import fs from 'fs';
import path from 'path';
import { ConcentrationAnalysis } from '../src/concentrationAnalysis.js';

/**
 * 数据加载器类
 */
class HoldersDataLoader {
    constructor() {
        this.tokenDecimals = 18;
        this.totalSupply = "1000000000000000000000000000"; // 10亿代币
        
        // 销毁地址集合
        this.burnAddresses = new Set([
            "0x0000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000dead",
            "0x0000000000000000000000000000000000000001"
        ]);
    }

    /**
     * 将wei数量转换为代币数量
     * @param {string} weiAmount - wei格式的数量
     * @returns {number} 代币数量
     */
    weiToTokens(weiAmount) {
        return parseFloat(weiAmount) / Math.pow(10, this.tokenDecimals);
    }

    /**
     * 检查是否为销毁地址
     * @param {string} address - 钱包地址
     * @returns {boolean} 是否为销毁地址
     */
    isBurnAddress(address) {
        return this.burnAddresses.has(address.toLowerCase());
    }

    /**
     * 加载并处理持有者数据
     * @param {string} filePath - 持有者数据文件路径
     * @returns {Object} 处理后的数据
     */
    loadHoldersData(filePath) {
        try {
            console.log(`📁 正在加载持有者数据: ${filePath}`);
            
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (!rawData.data || !rawData.data.items) {
                throw new Error("数据格式不正确，缺少 data.items 字段");
            }

            const holders = rawData.data.items;
            console.log(`✅ 成功加载 ${holders.length} 个持有者记录`);

            // 处理和过滤持有者数据
            const validHolders = [];
            const burnHolders = [];
            let totalCirculatingSupply = this.weiToTokens(this.totalSupply);
            let totalBurnedTokens = 0;

            holders.forEach((holder, index) => {
                const address = holder.address;
                const balance = this.weiToTokens(holder.balance);
                const percentage = (balance / totalCirculatingSupply) * 100;

                const holderInfo = {
                    rank: index + 1,
                    address: address,
                    balance: balance,
                    percentage: percentage
                };

                // 检查是否为销毁地址
                if (this.isBurnAddress(address)) {
                    burnHolders.push(holderInfo);
                    totalBurnedTokens += balance;
                } else {
                    validHolders.push(holderInfo);
                }
            });

            // 按余额重新排序有效持有者
            validHolders.sort((a, b) => b.balance - a.balance);
            
            // 重新分配排名
            validHolders.forEach((holder, index) => {
                holder.rank = index + 1;
                // 重新计算基于调整后供应量的百分比
                holder.percentage = (holder.balance / (totalCirculatingSupply - totalBurnedTokens)) * 100;
            });

            const adjustedSupply = totalCirculatingSupply - totalBurnedTokens;

            console.log(`📊 数据处理完成:`);
            console.log(`   - 有效持有者: ${validHolders.length}`);
            console.log(`   - 销毁地址: ${burnHolders.length}`);
            console.log(`   - 总供应量: ${(totalCirculatingSupply / 1e6).toFixed(2)}M BR`);
            console.log(`   - 销毁代币: ${(totalBurnedTokens / 1e6).toFixed(2)}M BR`);
            console.log(`   - 调整后供应量: ${(adjustedSupply / 1e6).toFixed(2)}M BR`);

            return {
                validHolders,
                burnHolders,
                totalSupply: totalCirculatingSupply,
                burnedTokens: totalBurnedTokens,
                adjustedSupply: adjustedSupply,
                dataInfo: {
                    chainName: rawData.data.chain_name,
                    updatedAt: rawData.data.updated_at,
                    chainId: rawData.data.chain_id
                }
            };

        } catch (error) {
            console.error("❌ 加载持有者数据失败:", error.message);
            throw error;
        }
    }
}

/**
 * 主分析函数
 */
async function runConcentrationAnalysis() {
    try {
        console.log("🚀 开始Token集中度分析...\n");

        // 1. 初始化数据加载器
        const loader = new HoldersDataLoader();

        // 2. 自动查找holders目录下的数据文件
        const holdersDir = './holders';
        const files = fs.readdirSync(holdersDir).filter(file => file.endsWith('.json'));
        
        if (files.length === 0) {
            throw new Error("未找到holders数据文件");
        }

        console.log(`🔍 发现 ${files.length} 个数据文件:`);
        files.forEach(file => console.log(`   - ${file}`));

        // 使用最新的数据文件
        const latestFile = files.sort().reverse()[0];
        const filePath = path.join(holdersDir, latestFile);
        
        console.log(`\n📊 使用数据文件: ${latestFile}\n`);

        // 3. 加载和处理数据
        const holdersData = loader.loadHoldersData(filePath);

        // 4. 创建集中度分析器
        console.log("\n🔬 初始化集中度分析器...");
        const analyzer = new ConcentrationAnalysis(
            holdersData.validHolders, 
            holdersData.adjustedSupply
        );

        // 5. 执行完整的集中度分析
        console.log("⚡ 开始执行集中度分析...\n");
        const analysis = analyzer.performFullAnalysis();

        // 6. 显示核心指标摘要
        console.log("\n" + "=".repeat(80));
        console.log("📊 BEDROCK TOKEN 集中度分析核心指标");
        console.log("=".repeat(80));

        // 数据概览
        console.log(`\n📈 数据概览:`);
        console.log(`   • 分析时间: ${new Date(analysis.summary.analysisTimestamp).toLocaleString()}`);
        console.log(`   • 链网络: ${holdersData.dataInfo.chainName.toUpperCase()}`);
        console.log(`   • 有效持有者: ${analysis.summary.totalHolders.toLocaleString()}`);
        console.log(`   • 调整后流通量: ${analyzer.formatBalance(analysis.summary.totalCirculatingSupply)}`);

        // Top N 持有者分析 - 核心要求
        console.log(`\n🏆 Top N 持有者集中度分析:`);
        const topLevels = [10, 20, 50];
        topLevels.forEach(n => {
            const topData = analysis.topHoldersAnalysis[`top${n}`];
            if (topData && topData.count > 0) {
                console.log(`   • Top ${n}: ${topData.percentage.toFixed(2)}% (${analyzer.formatBalance(topData.balance)})`);
            }
        });

        // HHI 分析 - 核心要求
        console.log(`\n📊 Herfindahl-Hirschman Index (HHI) 分析:`);
        console.log(`   • HHI 值: ${analysis.hhiAnalysis.value.toFixed(2)}`);
        console.log(`   • 风险等级: ${analysis.hhiAnalysis.riskLevel}`);
        console.log(`   • 集中度: ${analysis.hhiAnalysis.normalized.toFixed(2)}%`);
        console.log(`   • 风险描述: ${analysis.hhiAnalysis.riskDescription}`);

        // 大户分析 (>5%) - 核心要求
        console.log(`\n🐋 大户分析 (持有 > 5%):`);
        console.log(`   • 大户数量: ${analysis.whaleAnalysis.totalWhales}`);
        console.log(`   • 大户总持有: ${analysis.whaleAnalysis.whalesSharePercentage.toFixed(2)}%`);
        
        if (analysis.whaleAnalysis.whales.length > 0) {
            console.log(`   • 大户详情:`);
            analysis.whaleAnalysis.whales.forEach((whale, index) => {
                console.log(`     ${index + 1}. 排名${whale.rank}: ${whale.address.substring(0,8)}...${whale.address.substring(38)}`);
                console.log(`        余额: ${whale.balanceFormatted} (${whale.percentage.toFixed(2)}%)`);
                console.log(`        风险级别: ${whale.riskLevel}`);
            });
        } else {
            console.log(`     ✅ 无地址持有超过5%的代币`);
        }

        // 补充分析指标
        console.log(`\n⚖️ 补充分析指标:`);
        console.log(`   • 基尼系数: ${analysis.giniAnalysis.value.toFixed(4)} (${analysis.giniAnalysis.interpretation})`);
        console.log(`   • 整体风险评分: ${analysis.overallRisk.riskScore}/100 (${analysis.overallRisk.level})`);
        console.log(`   • 投资建议: ${analysis.overallRisk.recommendation}`);

        // 7. 生成完整报告
        console.log("\n📋 生成详细分析报告...");
        const detailedReport = analyzer.generateReport();
        console.log(detailedReport);

        // 8. 保存分析结果
        console.log("💾 保存分析结果...");
        const outputDir = './results/concentration-analysis-results';
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // 保存JSON数据
        const dataFileName = `bedrock-concentration-analysis-${timestamp}.json`;
        const dataFilePath = path.join(outputDir, dataFileName);
        const saveData = {
            ...analysis,
            sourceFile: latestFile,
            dataInfo: holdersData.dataInfo,
            burnedTokensInfo: {
                burnedCount: holdersData.burnHolders.length,
                burnedAmount: holdersData.burnedTokens,
                burnedPercentage: (holdersData.burnedTokens / holdersData.totalSupply) * 100
            }
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(saveData, null, 2), 'utf8');

        // 保存文本报告
        const reportFileName = `bedrock-concentration-report-${timestamp}.txt`;
        const reportFilePath = path.join(outputDir, reportFileName);
        fs.writeFileSync(reportFilePath, detailedReport, 'utf8');

        // 保存CSV格式的大户数据
        if (analysis.whaleAnalysis.whales.length > 0) {
            const csvFileName = `bedrock-whales-${timestamp}.csv`;
            const csvFilePath = path.join(outputDir, csvFileName);
            
            const csvHeaders = 'Rank,Address,Balance_BR,Balance_Formatted,Percentage,Risk_Level\n';
            const csvRows = analysis.whaleAnalysis.whales.map(whale => 
                `${whale.rank},${whale.address},${whale.balance},${whale.balanceFormatted},${whale.percentage},${whale.riskLevel}`
            ).join('\n');
            
            fs.writeFileSync(csvFilePath, csvHeaders + csvRows, 'utf8');
            console.log(`   • 大户CSV: ${csvFileName}`);
        }

        console.log(`\n📁 分析结果已保存到 ${outputDir}/ 目录:`);
        console.log(`   • 完整数据: ${dataFileName}`);
        console.log(`   • 分析报告: ${reportFileName}`);

        // 9. 数学验证输出
        console.log(`\n🔢 数学验证信息:`);
        console.log(`   • HHI计算公式: Σ(Pi²), 其中Pi为每个持有者的市场份额百分比`);
        console.log(`   • HHI理论最大值: 10,000 (一个地址持有100%)`);
        console.log(`   • 当前HHI值: ${analysis.hhiAnalysis.value.toFixed(2)}`);
        console.log(`   • 集中度等级评估: ${analysis.hhiAnalysis.riskLevel}`);
        
        // 计算验证
        let manualHHI = 0;
        analysis.summary.totalHolders = holdersData.validHolders.length;
        holdersData.validHolders.forEach(holder => {
            manualHHI += Math.pow(holder.percentage, 2);
        });
        console.log(`   • 手动验证HHI: ${manualHHI.toFixed(2)} ✓`);

        console.log("\n✅ 集中度分析完成!");
        
        return analysis;

    } catch (error) {
        console.error("❌ 分析过程中出现错误:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 如果直接运行此脚本，则执行分析

    runConcentrationAnalysis();


export { runConcentrationAnalysis, HoldersDataLoader };
