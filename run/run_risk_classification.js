import { RiskAddressClassifier } from '../src/risk_Address_Classification.js';

/**
 * 风险地址分类模块化示例
 * 演示如何使用RiskAddressClassifier进行各种分析
 */
export class RiskClassificationExample {
    constructor() {
        this.classifier = new RiskAddressClassifier();
    }

    /**
     * 单个地址分类示例
     * @param {string} address - 要分析的地址
     * @returns {Promise<Object>} 分类结果
     */
    async singleAddressExample(address) {
        console.log('\n=== 单个地址分类示例 ===');
        console.log(`分析地址: ${address}`);
        
        const result = await this.classifier.classifyAddress(address);
        
        console.log('\n📊 分类结果:');
        console.log(`地址: ${result.address}`);
        console.log(`分类: ${result.classification}`);
        console.log(`置信度: ${(result.confidence * 100).toFixed(1)}%`);
        
        if (result.details.localLabel) {
            console.log(`本地标签: ${result.details.localLabel.custodyOwner || result.details.localLabel.ownerKey}`);
        }
        
        return result;
    }

    /**
     * 批量地址分类示例
     * @param {Array<string>} addresses - 地址数组
     * @returns {Promise<Object>} 分析报告
     */
    async batchAddressExample(addresses) {
        console.log('\n=== 批量地址分类示例 ===');
        console.log(`分析 ${addresses.length} 个地址...`);
        
        const results = await this.classifier.batchClassifyAddresses(addresses);
        const report = this.classifier.generateReport(results);
        
        console.log('\n📈 分类统计报告:');
        console.log(`总地址数: ${report.total}`);
        console.log(`CEX地址: ${report.classifications.CEX}`);
        console.log(`Market Makers: ${report.classifications['Market Makers']}`);
        console.log(`Team/Vesting: ${report.classifications['Team/Vesting']}`);
        console.log(`未知类型: ${report.classifications.Unknown}`);
        console.log(`高置信度(≥80%): ${report.highConfidence}`);
        
        return report;
    }

    /**
     * 持有者风险分析示例
     * @param {Object} options - 分析选项
     * @returns {Promise<Object>} 持有者分析报告
     */
    async holdersAnalysisExample(options = {}) {
        console.log('\n=== Holders风险分析示例 ===');
        
        const defaultOptions = {
            minHoldingPercentage: 1,    // 最小持有1%
            topN: 20,                   // 分析前20个大户
            includeBalance: true,       // 包含余额信息
            sortBy: 'holdingPercentage' // 按持有占比排序
        };
        
        const analysisOptions = { ...defaultOptions, ...options };
        console.log(`分析配置:`, analysisOptions);
        
        const holdersReport = await this.classifier.analyzeHolders(analysisOptions);
        
        if (holdersReport.error) {
            console.error(`❌ 分析失败: ${holdersReport.error}`);
            return holdersReport;
        }
        
        console.log('\n📊 持有者分析报告摘要:');
        console.log(`发现持有者总数: ${holdersReport.totalHoldersFound}`);
        console.log(`分析持有者数量: ${holdersReport.totalHoldersAnalyzed}`);
        console.log(`代币信息: ${holdersReport.tokenInfo.map(t => `${t.name}(${t.symbol})`).join(', ')}`);
        
        console.log('\n📈 持有分布:');
        const dist = holdersReport.holdingDistribution;
        console.log(`大户(>10%): ${dist.large}个`);
        console.log(`中户(1-10%): ${dist.medium}个`);
        console.log(`小户(0.1-1%): ${dist.small}个`);
        console.log(`微户(<0.1%): ${dist.micro}个`);
        
        console.log('\n🚨 高风险持有者 (前5名):');
        holdersReport.topRiskHolders.slice(0, 5).forEach((holder, index) => {
            console.log(`${index + 1}. ${holder.address}`);
            console.log(`   分类: ${holder.classification} (${(holder.confidence * 100).toFixed(1)}%)`);
            console.log(`   持有: ${holder.holdingPercentage}% ${holder.tokenSymbol}`);
            console.log(`   风险评分: ${holder.riskScore.toFixed(2)}`);
        });
        
        return holdersReport;
    }

    /**
     * 导出分析结果
     * @param {Object} report - 分析报告
     * @param {string} filename - 文件名
     */
    async exportReport(report, filename) {
        await this.classifier.exportResults(report, filename);
        console.log(`✅ 分析结果已导出: ${filename}`);
    }

    /**
     * 运行完整示例流程
     */
    async runCompleteExample() {
        try {
            console.log('🚀 开始风险地址分类完整示例...');
            
            // 示例地址
            const testAddresses = [
                '0x3cc936b795a188f0e246cbb2d74c5bd190aecf18',
                '0x28f1c61b4e3a1fe79de1af2c8c0b19348bbfa25e',
                '0x853ee4b2a13f8a742d64c8f088be7ba2131f670d'
            ];
            
            // 1. 单个地址分析
            await this.singleAddressExample(testAddresses[0]);
            
            // 2. 批量地址分析
            const batchReport = await this.batchAddressExample(testAddresses);
            await this.exportReport(batchReport, `batch_analysis_${Date.now()}.json`);
            
            // 3. 持有者分析
            const holdersReport = await this.holdersAnalysisExample({
                minHoldingPercentage: 0.1,
                topN: 100
            });
            
            if (!holdersReport.error) {
                await this.exportReport(holdersReport, `holders_analysis_${Date.now()}.json`);
            }
            
            console.log('\n✅ 完整示例执行完成！');
            
        } catch (error) {
            console.error('❌ 示例执行失败:', error.message);
        }
    }
}

// 模块化使用示例
export async function demonstrateUsage() {
    const example = new RiskClassificationExample();
    await example.runCompleteExample();
}

// 如果直接运行此文件，则执行示例
    demonstrateUsage();
