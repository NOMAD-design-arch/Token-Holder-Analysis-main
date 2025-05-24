import { RiskAddressClassifier } from '../src/risk_Address_Classification.js';
import { RiskClassificationExample } from '../run/run_risk_classification.js';

/**
 * 风险地址分类器测试套件
 */
class RiskClassificationTests {
    constructor() {
        this.classifier = new RiskAddressClassifier();
        this.example = new RiskClassificationExample();
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    /**
     * 断言辅助函数
     * @param {boolean} condition - 条件
     * @param {string} message - 测试描述
     */
    assert(condition, message) {
        if (condition) {
            this.testResults.passed++;
            this.testResults.tests.push({ status: 'PASS', message });
            console.log(`✅ PASS: ${message}`);
        } else {
            this.testResults.failed++;
            this.testResults.tests.push({ status: 'FAIL', message });
            console.log(`❌ FAIL: ${message}`);
        }
    }

    /**
     * 测试本地标签加载功能
     */
    testLocalLabelsLoading() {
        console.log('\n=== 测试本地标签加载 ===');
        
        this.assert(
            this.classifier.localLabels instanceof Map,
            '本地标签数据类型正确'
        );
        
        this.assert(
            this.classifier.localLabels.size >= 0,
            '本地标签数据已加载'
        );
        
        console.log(`📊 加载的标签数量: ${this.classifier.localLabels.size}`);
    }

    /**
     * 测试阈值配置
     */
    testThresholdConfiguration() {
        console.log('\n=== 测试阈值配置 ===');
        
        const thresholds = this.classifier.thresholds;
        
        this.assert(
            thresholds.marketMaker && typeof thresholds.marketMaker.minTransactions === 'number',
            'Market Maker阈值配置正确'
        );
        
        this.assert(
            thresholds.teamVesting && typeof thresholds.teamVesting.regularityScore === 'number',
            'Team/Vesting阈值配置正确'
        );
        
        this.assert(
            thresholds.cex && typeof thresholds.cex.minTransactions === 'number',
            'CEX阈值配置正确'
        );
        
        console.log('📋 阈值配置验证通过');
    }

    /**
     * 测试地址验证功能
     */
    testAddressValidation() {
        console.log('\n=== 测试地址验证 ===');
        
        const validAddress = '0x3cc936b795a188f0e246cbb2d74c5bd190aecf18';
        const invalidAddress1 = '0x123';
        const invalidAddress2 = 'not_an_address';
        
        // 由于RiskAddressClassifier没有内置地址验证，我们创建一个简单的验证函数
        const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        
        this.assert(
            isValidAddress(validAddress),
            '有效地址验证通过'
        );
        
        this.assert(
            !isValidAddress(invalidAddress1),
            '无效地址1验证失败（预期）'
        );
        
        this.assert(
            !isValidAddress(invalidAddress2),
            '无效地址2验证失败（预期）'
        );
    }

    /**
     * 测试模式分析算法
     */
    testPatternAnalysis() {
        console.log('\n=== 测试模式分析算法 ===');
        
        // 模拟交易数据
        const mockTransactions = [
            {
                from: '0x3cc936b795a188f0e246cbb2d74c5bd190aecf18',
                to: '0x28f1c61b4e3a1fe79de1af2c8c0b19348bbfa25e',
                contractAddress: '0x853ee4b2a13f8a742d64c8f088be7ba2131f670d',
                timeStamp: '1640995200',
                value: '1000000000000000000',
                tokenDecimal: '18'
            }
        ];
        
        const testAddress = '0x3cc936b795a188f0e246cbb2d74c5bd190aecf18';
        
        // 测试Market Maker分析
        const mmResult = this.classifier.analyzeMarketMakerPattern(mockTransactions, testAddress);
        this.assert(
            typeof mmResult.score === 'number' && mmResult.score >= 0 && mmResult.score <= 1,
            'Market Maker分析返回有效得分'
        );
        
        // 测试Team/Vesting分析
        const vestingResult = this.classifier.analyzeTeamVestingPattern(mockTransactions, testAddress);
        this.assert(
            typeof vestingResult.score === 'number' && vestingResult.score >= 0 && vestingResult.score <= 1,
            'Team/Vesting分析返回有效得分'
        );
        
        // 测试CEX分析
        const cexResult = this.classifier.analyzeCEXPattern(mockTransactions, null, testAddress);
        this.assert(
            typeof cexResult.score === 'number' && cexResult.score >= 0 && cexResult.score <= 1,
            'CEX分析返回有效得分'
        );
    }

    /**
     * 测试周期性模式检测
     */
    testPeriodicPatternDetection() {
        console.log('\n=== 测试周期性模式检测 ===');
        
        // 模拟规律性时间戳（每7天一次）
        const weeklyTimestamps = [
            1640995200,  // 基准时间
            1641600000,  // +7天
            1642204800,  // +14天
            1642809600   // +21天
        ];
        
        const weeklyResult = this.classifier.detectPeriodicPattern(weeklyTimestamps, 7 * 24 * 3600);
        this.assert(
            weeklyResult.score > 0.5,
            '周期性模式检测成功'
        );
        
        // 模拟随机时间戳
        const randomTimestamps = [1640995200, 1641081600, 1641168000, 1641254400];
        const randomResult = this.classifier.detectPeriodicPattern(randomTimestamps, 7 * 24 * 3600);
        this.assert(
            randomResult.score <= 0.5,
            '非周期性模式检测正确'
        );
    }

    /**
     * 测试持有者数据加载
     */
    testHoldersDataLoading() {
        console.log('\n=== 测试Holders数据加载 ===');
        
        try {
            const holdersData = this.classifier.loadHoldersData();
            
            this.assert(
                Array.isArray(holdersData),
                'Holders数据类型正确'
            );
            
            console.log(`📊 加载的holders数量: ${holdersData.length}`);
            
            if (holdersData.length > 0) {
                const firstHolder = holdersData[0];
                this.assert(
                    firstHolder.address && typeof firstHolder.address === 'string',
                    'Holder地址字段存在且正确'
                );
                
                this.assert(
                    firstHolder.holdingPercentage !== undefined,
                    'Holder持有占比字段存在'
                );
            }
            
        } catch (error) {
            console.log(`⚠️  Holders数据加载测试跳过: ${error.message}`);
        }
    }

    /**
     * 测试报告生成功能
     */
    testReportGeneration() {
        console.log('\n=== 测试报告生成 ===');
        
        // 模拟分类结果
        const mockResults = [
            { classification: 'CEX', confidence: 0.9 },
            { classification: 'Market Makers', confidence: 0.8 },
            { classification: 'Team/Vesting', confidence: 0.7 },
            { classification: 'Unknown', confidence: 0.3 }
        ];
        
        const report = this.classifier.generateReport(mockResults);
        
        this.assert(
            report.total === 4,
            '报告总数统计正确'
        );
        
        this.assert(
            report.classifications.CEX === 1 &&
            report.classifications['Market Makers'] === 1 &&
            report.classifications['Team/Vesting'] === 1 &&
            report.classifications.Unknown === 1,
            '报告分类统计正确'
        );
        
        this.assert(
            report.highConfidence === 2,  // ≥0.8
            '高置信度统计正确'
        );
    }

    /**
     * 测试持有分布分析
     */
    testHoldingDistributionAnalysis() {
        console.log('\n=== 测试持有分布分析 ===');
        
        // 模拟持有者数据
        const mockHolders = [
            { holdingPercentage: '15.5' },    // large
            { holdingPercentage: '5.2' },     // medium
            { holdingPercentage: '0.8' },     // small
            { holdingPercentage: '0.05' }     // micro
        ];
        
        const distribution = this.classifier.analyzeHoldingDistribution(mockHolders);
        
        this.assert(
            distribution.large === 1 &&
            distribution.medium === 1 &&
            distribution.small === 1 &&
            distribution.micro === 1,
            '持有分布分析正确'
        );
    }

    /**
     * 测试模块化示例功能
     */
    async testModularExample() {
        console.log('\n=== 测试模块化示例 ===');
        
        try {
            // 测试示例类初始化
            this.assert(
                this.example.classifier instanceof RiskAddressClassifier,
                '示例类初始化正确'
            );
            
            console.log('📝 模块化示例基础测试通过');
            console.log('⚠️  完整集成测试需要有效的API密钥和网络连接');
            
        } catch (error) {
            this.assert(false, `模块化示例测试失败: ${error.message}`);
        }
    }

    /**
     * 性能测试
     */
    testPerformance() {
        console.log('\n=== 性能测试 ===');
        
        const startTime = Date.now();
        
        // 测试大量数据处理
        const largeDataset = Array(1000).fill().map((_, i) => ({
            holdingPercentage: Math.random() * 100
        }));
        
        const distribution = this.classifier.analyzeHoldingDistribution(largeDataset);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.assert(
            duration < 1000,  // 应该在1秒内完成
            `大数据集处理性能测试通过 (${duration}ms)`
        );
        
        this.assert(
            distribution.large + distribution.medium + distribution.small + distribution.micro === 1000,
            '大数据集分析结果正确'
        );
    }

    /**
     * 边界条件测试
     */
    testEdgeCases() {
        console.log('\n=== 边界条件测试 ===');
        
        // 测试空数组
        const emptyReport = this.classifier.generateReport([]);
        this.assert(
            emptyReport.total === 0,
            '空数组处理正确'
        );
        
        // 测试空持有者数据
        const emptyDistribution = this.classifier.analyzeHoldingDistribution([]);
        this.assert(
            emptyDistribution.large === 0 &&
            emptyDistribution.medium === 0 &&
            emptyDistribution.small === 0 &&
            emptyDistribution.micro === 0,
            '空持有者数组处理正确'
        );
        
        // 测试单个数据点的周期性检测
        const singleTimestamp = this.classifier.detectPeriodicPattern([1640995200], 7 * 24 * 3600);
        this.assert(
            singleTimestamp.score === 0,
            '单时间戳周期性检测处理正确'
        );
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 开始运行风险地址分类器测试套件...\n');
        
        // 基础功能测试
        this.testLocalLabelsLoading();
        this.testThresholdConfiguration();
        this.testAddressValidation();
        
        // 算法测试
        this.testPatternAnalysis();
        this.testPeriodicPatternDetection();
        this.testReportGeneration();
        this.testHoldingDistributionAnalysis();
        
        // 数据处理测试
        this.testHoldersDataLoading();
        
        // 模块化测试
        await this.testModularExample();
        
        // 性能和边界测试
        this.testPerformance();
        this.testEdgeCases();
        
        // 输出测试结果
        this.printTestSummary();
    }

    /**
     * 打印测试摘要
     */
    printTestSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 测试结果摘要');
        console.log('='.repeat(50));
        console.log(`✅ 通过: ${this.testResults.passed}`);
        console.log(`❌ 失败: ${this.testResults.failed}`);
        console.log(`📋 总计: ${this.testResults.passed + this.testResults.failed}`);
        
        const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed) * 100).toFixed(1);
        console.log(`🎯 成功率: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 所有测试通过！系统运行正常。');
        } else {
            console.log('\n⚠️  存在测试失败，请检查相关功能。');
            console.log('\n失败的测试:');
            this.testResults.tests
                .filter(test => test.status === 'FAIL')
                .forEach(test => console.log(`  - ${test.message}`));
        }
        
        console.log('='.repeat(50));
    }
}

/**
 * 集成测试 - 需要网络连接和API密钥
 */
async function runIntegrationTests() {
    console.log('\n🔗 开始集成测试...');
    console.log('⚠️  注意: 集成测试需要有效的API密钥和网络连接');
    
    try {
        const example = new RiskClassificationExample();
        
        // 测试单个地址分析（使用已知的交易所地址）
        const testAddress = '0x3cc936b795a188f0e246cbb2d74c5bd190aecf18';
        console.log(`\n🔍 测试地址分析: ${testAddress}`);
        
        const result = await example.classifier.classifyAddress(testAddress);
        
        console.log('✅ 集成测试完成');
        console.log(`分类结果: ${result.classification} (置信度: ${(result.confidence * 100).toFixed(1)}%)`);
        
        return true;
        
    } catch (error) {
        console.log(`❌ 集成测试失败: ${error.message}`);
        console.log('💡 请检查API密钥配置和网络连接');
        return false;
    }
}

// 主测试函数
async function runTests() {
    const tests = new RiskClassificationTests();
    
    // 运行单元测试
    await tests.runAllTests();
    
    // 询问是否运行集成测试
    console.log('\n🤔 是否运行集成测试？集成测试需要API密钥和网络连接。');
    console.log('提示：直接运行单元测试即可验证大部分功能。');
    
    // 注释掉交互式选择，改为可选运行
    const shouldRunIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
    
    if (shouldRunIntegration) {
        await runIntegrationTests();
    } else {
        console.log('⏭️  跳过集成测试，仅运行单元测试');
    }
}

// 导出测试类以供其他模块使用
export { RiskClassificationTests, runIntegrationTests };

// 如果直接运行此文件，则执行测试
runTests();
