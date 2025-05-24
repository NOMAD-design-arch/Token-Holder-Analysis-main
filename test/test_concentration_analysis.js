/**
 * @fileoverview 集中度分析测试脚本
 * 演示Token集中度分析的完整功能
 */

import { ConcentrationAnalysis } from '../src/concentrationAnalysis.js';
import fs from 'fs';
import path from 'path';

/**
 * 保存测试结果到test/test_results目录
 * @param {Object} analysis - 分析结果
 */
async function saveTestResults(analysis) {
    try {
        const outputDir = './test/test_results';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // 保存JSON格式的分析结果
        const dataFileName = `bedrock-concentration-test-${timestamp}.json`;
        const dataFilePath = path.join(outputDir, dataFileName);
        const testData = {
            ...analysis,
            testInfo: {
                testType: 'concentration_analysis',
                timestamp: new Date().toISOString(),
                description: '集中度分析测试结果'
            }
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(testData, null, 2), 'utf8');

        // 保存文本格式的测试报告
        const reportFileName = `bedrock-concentration-test-report-${timestamp}.txt`;
        const reportFilePath = path.join(outputDir, reportFileName);
        const analyzer = new ConcentrationAnalysis([], 0); // 创建临时实例用于生成报告
        analyzer.analysisCache = analysis; // 设置缓存数据
        const report = `集中度分析测试报告\n生成时间: ${new Date().toLocaleString()}\n\n${analyzer.generateReport()}`;
        fs.writeFileSync(reportFilePath, report, 'utf8');

        console.log(`   ✅ 测试结果已保存到 ${outputDir}/`);
        console.log(`      - 完整数据: ${dataFileName}`);
        console.log(`      - 测试报告: ${reportFileName}`);
        
    } catch (error) {
        console.error(`   ❌ 保存测试结果失败: ${error.message}`);
    }
}

/**
 * 生成模拟的持有者数据用于测试
 * @param {number} totalHolders - 总持有者数量
 * @param {number} totalSupply - 总供应量
 * @returns {Array} 模拟的持有者数据
 */
function generateMockHolders(totalHolders = 1000, totalSupply = 1000000000) {
    const holders = [];
    let remainingSupply = totalSupply;
    
    // 生成一些大户（前10名持有较多）
    for (let i = 0; i < Math.min(10, totalHolders); i++) {
        const percentage = Math.random() * 15 + 2; // 2-17%
        const balance = (totalSupply * percentage) / 100;
        
        holders.push({
            rank: i + 1,
            address: `0x${Math.random().toString(16).substr(2, 40)}`,
            balance: balance,
            percentage: percentage
        });
        
        remainingSupply -= balance;
    }
    
    // 生成其余持有者
    for (let i = 10; i < totalHolders; i++) {
        const maxBalance = remainingSupply / (totalHolders - i);
        const balance = Math.random() * maxBalance * 0.8; // 随机分配剩余供应量
        
        holders.push({
            rank: i + 1,
            address: `0x${Math.random().toString(16).substr(2, 40)}`,
            balance: balance,
            percentage: (balance / totalSupply) * 100
        });
        
        remainingSupply -= balance;
    }
    
    // 按余额排序
    holders.sort((a, b) => b.balance - a.balance);
    
    // 重新分配排名
    holders.forEach((holder, index) => {
        holder.rank = index + 1;
    });
    
    return holders;
}

/**
 * 主测试函数
 */
async function testConcentrationAnalysis() {
    console.log("🧪 开始集中度分析测试...\n");
    
    // 生成测试数据
    const totalSupply = 1000000000; // 10亿代币
    const mockHolders = generateMockHolders(1000, totalSupply);
    
    console.log(`📊 测试数据生成完成:`);
    console.log(`   - 总持有者: ${mockHolders.length}`);
    console.log(`   - 总供应量: ${(totalSupply / 1e6).toFixed(2)}M 代币`);
    console.log(`   - 最大持有者: ${mockHolders[0].percentage.toFixed(2)}%`);
    console.log(`   - 前10名合计: ${mockHolders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0).toFixed(2)}%\n`);
    
    // 创建集中度分析器
    const analyzer = new ConcentrationAnalysis(mockHolders, totalSupply);
    
    // 执行完整分析
    console.log("🔄 执行集中度分析...");
    const analysis = analyzer.performFullAnalysis();
    
    // 显示分析结果摘要
    console.log("\n📈 集中度分析结果摘要:");
    console.log("=".repeat(50));
    
    // Top N 持有者分析
    console.log("\n🏆 Top N 持有者分析:");
    Object.entries(analysis.topHoldersAnalysis).forEach(([key, data]) => {
        if (data.count > 0) {
            console.log(`   ${key.toUpperCase()}: ${data.percentage.toFixed(2)}% (${analyzer.formatBalance(data.balance)})`);
        }
    });
    
    // HHI 分析
    console.log("\n📊 HHI (Herfindahl-Hirschman Index) 分析:");
    console.log(`   HHI值: ${analysis.hhiAnalysis.value.toFixed(2)}`);
    console.log(`   风险等级: ${analysis.hhiAnalysis.riskLevel}`);
    console.log(`   风险描述: ${analysis.hhiAnalysis.riskDescription}`);
    console.log(`   集中度百分比: ${analysis.hhiAnalysis.normalized.toFixed(2)}%`);
    
    // 大户分析
    console.log("\n🐋 大户分析 (持有>5%):");
    console.log(`   大户数量: ${analysis.whaleAnalysis.totalWhales}`);
    console.log(`   大户总持有: ${analysis.whaleAnalysis.whalesSharePercentage.toFixed(2)}%`);
    
    if (analysis.whaleAnalysis.whales.length > 0) {
        console.log("   大户详情:");
        analysis.whaleAnalysis.whales.forEach(whale => {
            console.log(`     排名${whale.rank}: ${whale.address.substring(0,8)}...${whale.address.substring(38)} ${whale.balanceFormatted} (${whale.percentage.toFixed(2)}%) [${whale.riskLevel}]`);
        });
    }
    
    // 基尼系数
    console.log("\n⚖️ 基尼系数分析:");
    console.log(`   基尼系数: ${analysis.giniAnalysis.value.toFixed(4)}`);
    console.log(`   不平等程度: ${analysis.giniAnalysis.interpretation}`);
    console.log(`   评分标准: ${analysis.giniAnalysis.scale}`);
    
    // 整体风险评估
    console.log("\n🚨 整体风险评估:");
    console.log(`   风险评分: ${analysis.overallRisk.riskScore}/100`);
    console.log(`   风险等级: ${analysis.overallRisk.level}`);
    console.log(`   投资建议: ${analysis.overallRisk.recommendation}`);
    
    if (analysis.overallRisk.riskFactors.length > 0) {
        console.log("   风险因素:");
        analysis.overallRisk.riskFactors.forEach(factor => {
            console.log(`     - ${factor}`);
        });
    }
    
    // 生成完整报告
    console.log("\n📋 生成完整分析报告:");
    console.log("=".repeat(80));
    const report = analyzer.generateReport();
    console.log(report);
    
    // 测试不同场景
    console.log("\n🔬 测试不同集中度场景:");
    console.log("=".repeat(50));
    
    // 场景1: 高集中度
    console.log("\n场景1: 高集中度测试");
    const highConcHolders = [
        { rank: 1, address: '0x1111111111111111111111111111111111111111', balance: 500000000, percentage: 50 },
        { rank: 2, address: '0x2222222222222222222222222222222222222222', balance: 300000000, percentage: 30 },
        { rank: 3, address: '0x3333333333333333333333333333333333333333', balance: 200000000, percentage: 20 }
    ];
    
    const highConcAnalyzer = new ConcentrationAnalysis(highConcHolders, totalSupply);
    const highConcAnalysis = highConcAnalyzer.performFullAnalysis();
    
    console.log(`   HHI: ${highConcAnalysis.hhiAnalysis.value.toFixed(2)} (${highConcAnalysis.hhiAnalysis.riskLevel})`);
    console.log(`   大户数量: ${highConcAnalysis.whaleAnalysis.totalWhales}`);
    console.log(`   整体风险: ${highConcAnalysis.overallRisk.level} (${highConcAnalysis.overallRisk.riskScore}/100)`);
    
    // 场景2: 低集中度
    console.log("\n场景2: 低集中度测试");
    const lowConcHolders = [];
    for (let i = 0; i < 1000; i++) {
        lowConcHolders.push({
            rank: i + 1,
            address: `0x${i.toString(16).padStart(40, '0')}`,
            balance: totalSupply / 1000,
            percentage: 0.1
        });
    }
    
    const lowConcAnalyzer = new ConcentrationAnalysis(lowConcHolders, totalSupply);
    const lowConcAnalysis = lowConcAnalyzer.performFullAnalysis();
    
    console.log(`   HHI: ${lowConcAnalysis.hhiAnalysis.value.toFixed(2)} (${lowConcAnalysis.hhiAnalysis.riskLevel})`);
    console.log(`   大户数量: ${lowConcAnalysis.whaleAnalysis.totalWhales}`);
    console.log(`   整体风险: ${lowConcAnalysis.overallRisk.level} (${lowConcAnalysis.overallRisk.riskScore}/100)`);
    
    // 保存测试结果
    console.log("\n💾 保存测试结果...");
    await saveTestResults(analysis);
    
    console.log("\n✅ 集中度分析测试完成!");
    
    return analysis;
}

/**
 * HHI计算原理说明
 */
function explainHHI() {
    console.log("\n📚 HHI (Herfindahl-Hirschman Index) 计算原理:");
    console.log("=".repeat(60));
    console.log(`
🎯 什么是HHI？
HHI是衡量市场集中度的经济学指标，在Token分析中用来评估持有权的集中程度。

📐 计算公式：
HHI = Σ(Pi²)
其中 Pi 是第i个持有者的市场份额（以百分比表示）

📊 风险等级划分：
• HHI < 1,500    → 低集中度 (分散持有，风险较低)
• 1,500 ≤ HHI < 2,500 → 中等集中度 (需要关注)  
• HHI ≥ 2,500    → 高集中度 (存在操控风险)
• HHI = 10,000   → 完全垄断 (一个地址持有100%)

💡 实际意义：
• 高HHI值：少数大户控制大部分代币，存在抛售风险、价格操控风险
• 低HHI值：持有分散，市场更加稳定，去中心化程度更高

🔍 计算示例：
假设有3个持有者，分别持有50%、30%、20%：
HHI = 50² + 30² + 20² = 2500 + 900 + 400 = 3800 (高集中度)

假设有100个持有者，每人持有1%：
HHI = 100 × 1² = 100 (极低集中度)
`);
}

// 运行测试
explainHHI();
testConcentrationAnalysis().catch(console.error);

export { testConcentrationAnalysis, saveTestResults, generateMockHolders }; 