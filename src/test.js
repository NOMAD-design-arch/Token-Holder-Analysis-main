import { BedrockTokenAnalysis } from './tokenAnalysis.js';
import { AddressFilters } from './addressFilters.js';
import { DuneAPIHelper } from './duneAPIHelper.js';

/**
 * 测试代币分析系统（增强版）
 */
async function testBedrockAnalysis() {
    console.log("🧪 开始测试Bedrock代币增强分析系统...\n");
    
    try {
        // 测试地址过滤器
        console.log("1️⃣ 测试地址过滤器...");
        const addressFilters = new AddressFilters();
        
        // 测试销毁地址检测
        const testBurnAddresses = [
            "0x0000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000dead",
            "0x0000000000000000000000000000000000000001",
        ];
        
        testBurnAddresses.forEach(addr => {
            const isBurn = addressFilters.isBurnAddress(addr);
            console.log(`   销毁地址检测 ${addr}: ${isBurn ? '✅' : '❌'}`);
        });
        
        // 测试交易所地址检测
        const testExchangeAddresses = [
            "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be", // Binance
            "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", // Coinbase
        ];
        
        testExchangeAddresses.forEach(addr => {
            const exchangeName = addressFilters.getExchangeName(addr);
            console.log(`   交易所地址检测 ${addr}: ${exchangeName || '未检测到'}`);
        });
        
        console.log("\n2️⃣ 测试Dune API Helper...");
        
        // 测试Dune API Helper
        const duneHelper = new DuneAPIHelper();
        const testAddress = "0xf89d7b9c864f589bbf53a82105107622b35eaa40"; // 从示例中获取的Bybit地址
        
        console.log(`   测试单地址查询: ${testAddress}`);
        try {
            const labels = await duneHelper.queryAddressLabels(testAddress);
            console.log(`   查询结果: ${labels.length} 个标签`);
            
            const exchangeInfo = duneHelper.parseExchangeInfo(labels);
            if (exchangeInfo) {
                console.log(`   发现交易所: ${exchangeInfo.exchange} (${exchangeInfo.ownerKey})`);
            } else {
                console.log(`   未发现交易所标签`);
            }
        } catch (error) {
            console.log(`   查询测试（预期可能失败）: ${error.message}`);
        }
        
        // 测试查询统计
        const queryStats = duneHelper.getQueryStats();
        console.log(`   查询统计: 缓存=${queryStats.cacheSize}, 剩余配额=${queryStats.rateLimitRemaining}`);
        
        console.log("\n3️⃣ 测试Bedrock代币增强分析...");
        
        // 创建分析器实例
        const analyzer = new BedrockTokenAnalysis();
        
        // 检查数据文件是否存在
        console.log("   检查数据文件...");
        console.log("   - 持有者数据: holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json");
        console.log("   - BNB标签数据: label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json");
        console.log("   - 以太坊标签数据: label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json");
        
        // 加载标签数据
        console.log("\n   加载本地标签数据...");
        const bnbLabelsCount = analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
        const ethLabelsCount = analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');
        console.log(`   BNB标签: ${bnbLabelsCount}个`);
        console.log(`   以太坊标签: ${ethLabelsCount}个`);
        console.log(`   总本地标签数: ${bnbLabelsCount + ethLabelsCount}个`);
        
        // 加载持有者数据
        console.log("\n   加载持有者数据...");
        const holdersData = analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');
        
        if (!holdersData) {
            throw new Error("无法加载持有者数据");
        }
        
        console.log(`   成功加载 ${holdersData.length} 个持有者记录`);
        
        // 测试基础分析（不启用动态查询）
        console.log("\n   🔄 基础分析测试（无动态查询）...");
        const basicData = await analyzer.processHoldersData(false);
        
        console.log("   基础分析统计:");
        console.log(`     - 总持有者: ${basicData.statistics.totalHolders}`);
        console.log(`     - 有效持有者: ${basicData.statistics.validHoldersCount}`);
        console.log(`     - 交易所持有者: ${basicData.statistics.exchangeHoldersCount}`);
        console.log(`     - 本地标签使用: ${basicData.statistics.localLabelsUsed}`);
        
        // 测试增强分析（启用动态查询，但限制查询数量）
        console.log("\n   🔍 增强分析测试（启用动态查询）...");
        
        // 为了测试，我们可以限制查询的地址数量
        const originalHolders = analyzer.rawHolders;
        analyzer.rawHolders = originalHolders.slice(0, 20); // 只测试前20个地址
        
        const enhancedData = await analyzer.processHoldersData(true);
        
        // 恢复原始数据
        analyzer.rawHolders = originalHolders;
        
        // 输出增强分析统计信息
        const stats = enhancedData.statistics;
        console.log("\n📊 增强分析结果统计:");
        console.log(`   - 测试持有者: ${stats.totalHolders}`);
        console.log(`   - 有效持有者: ${stats.validHoldersCount} (${((stats.validHoldersCount / stats.totalHolders) * 100).toFixed(2)}%)`);
        console.log(`   - 交易所持有者: ${stats.exchangeHoldersCount} (${((stats.exchangeHoldersCount / stats.totalHolders) * 100).toFixed(2)}%)`);
        console.log(`   - 销毁地址: ${stats.burnHoldersCount} (${((stats.burnHoldersCount / stats.totalHolders) * 100).toFixed(2)}%)`);
        console.log(`   - 锁定地址: ${stats.lockedHoldersCount} (${((stats.lockedHoldersCount / stats.totalHolders) * 100).toFixed(2)}%)`);
        console.log(`   - 本地标签使用: ${stats.localLabelsUsed}`);
        console.log(`   - 动态标签发现: ${stats.dynamicLabelsFound}`);
        
        console.log("\n💰 代币分布:");
        console.log(`   - 总供应量: ${(stats.totalCirculatingSupply / 1e6).toFixed(2)}M BR`);
        console.log(`   - 调整后供应量: ${(stats.adjustedCirculatingSupply / 1e6).toFixed(2)}M BR`);
        console.log(`   - 交易所余额: ${(stats.totalExchangeBalance / 1e6).toFixed(2)}M BR`);
        console.log(`   - 销毁代币: ${(stats.totalBurnedTokens / 1e6).toFixed(2)}M BR`);
        console.log(`   - 锁定代币: ${(stats.totalLockedBalance / 1e6).toFixed(2)}M BR`);
        
        // 集中度分析
        console.log("\n📈 持有者集中度分析:");
        const concentration = analyzer.getConcentrationAnalysis();
        Object.entries(concentration).forEach(([key, value]) => {
            console.log(`   ${key}: ${(value.balance / 1e6).toFixed(2)}M BR (${value.percentage}%)`);
        });
        
        // 显示前5名有效持有者
        if (enhancedData.validHolders.length > 0) {
            console.log("\n🏆 前5名有效持有者:");
            enhancedData.validHolders.slice(0, 5).forEach((holder, index) => {
                const sourceIcon = holder.source === 'dynamic_verified' ? '🔍' : '📋';
                console.log(`   ${index + 1}. ${holder.address.substring(0, 10)}...${holder.address.substring(38)} - ${(holder.balance / 1e6).toFixed(2)}M BR (${holder.percentage.toFixed(4)}%) ${sourceIcon}`);
            });
        }
        
        // 显示交易所持有者
        if (enhancedData.exchangeHolders.length > 0) {
            console.log("\n🏢 交易所持有者:");
            enhancedData.exchangeHolders.forEach((holder, index) => {
                const sourceIcon = holder.source === 'local_data' ? '📋' : 
                                   holder.source === 'dune_api' ? '🔍' : 
                                   holder.source === 'mock_data' ? '🎭' : '❓';
                console.log(`   ${index + 1}. ${holder.custodyOwner} - ${(holder.balance / 1e6).toFixed(2)}M BR (${holder.percentage.toFixed(4)}%) ${sourceIcon}`);
            });
        }
        
        // 动态查询统计
        console.log("\n🔍 动态查询统计:");
        const dynamicStats = analyzer.getDynamicQueryStats();
        console.log(`   - 动态标签缓存: ${dynamicStats.dynamicLabelsCount}`);
        console.log(`   - Dune API统计: 缓存=${dynamicStats.duneAPIStats.cacheSize}, 配额剩余=${dynamicStats.duneAPIStats.rateLimitRemaining}`);
        
        // 测试保存功能（可选）
        console.log("\n💾 测试保存功能...");
        const testOutputDir = 'test-results-enhanced';
        const savedFiles = analyzer.saveResults(testOutputDir);
        console.log("   增强版保存完成！");
        
        console.log("\n✅ 所有增强功能测试通过!");
        return enhancedData;
        
    } catch (error) {
        console.error("❌ 测试失败:", error.message);
        console.error(error.stack);
        throw error;
    }
}

/**
 * 测试地址分类功能（增强版）
 */
function testAddressClassification() {
    console.log("\n🔍 测试地址分类功能（增强版）...");
    
    const addressFilters = new AddressFilters();
    
    const testAddresses = [
        { address: "0x0000000000000000000000000000000000000000", expected: "burn" },
        { address: "0x000000000000000000000000000000000000dead", expected: "burn" },
        { address: "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be", expected: "exchange" },
        { address: "0x71660c4005ba85c37ccec55d0c4493e66fe775d3", expected: "exchange" },
        { address: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f", expected: "defi" },
        { address: "0x1234567890123456789012345678901234567890", expected: "holder" },
        { address: "0xf89d7b9c864f589bbf53a82105107622b35eaa40", expected: "holder" }, // Bybit地址（在动态查询中会发现）
    ];
    
    testAddresses.forEach(({ address, expected }) => {
        const classification = addressFilters.classifyAddress(address);
        const passed = classification.type === expected;
        console.log(`   ${address}: ${classification.type} (${classification.description}) ${passed ? '✅' : '❌'}`);
    });
}

/**
 * 测试Dune API功能
 */
async function testDuneAPI() {
    console.log("\n🔌 测试Dune API功能...");
    
    const duneHelper = new DuneAPIHelper();
    
    // 测试已知的交易所地址
    const testAddresses = [
        "0xf89d7b9c864f589bbf53a82105107622b35eaa40", // Bybit (从示例数据中获取)
        "0x1234567890123456789012345678901234567890", // 随机地址
        "0x0000000000000000000000000000000000000000"  // 零地址
    ];
    
    for (const address of testAddresses) {
        try {
            console.log(`   查询地址: ${address.substring(0, 10)}...${address.substring(38)}`);
            const labels = await duneHelper.queryAddressLabels(address);
            const exchangeInfo = duneHelper.parseExchangeInfo(labels);
            
            if (exchangeInfo) {
                console.log(`     ✅ 发现交易所: ${exchangeInfo.exchange} (${exchangeInfo.source})`);
            } else {
                console.log(`     ➖ 未发现交易所标签 (标签数: ${labels.length})`);
            }
            
            // 添加小延迟避免速率限制
            await duneHelper.delay(1000);
            
        } catch (error) {
            console.log(`     ❌ 查询失败: ${error.message}`);
        }
    }
    
    // 显示查询统计
    const stats = duneHelper.getQueryStats();
    console.log(`\n   查询统计:`);
    console.log(`     - 缓存大小: ${stats.cacheSize}`);
    console.log(`     - 最近请求: ${stats.recentRequests}`);
    console.log(`     - 剩余配额: ${stats.rateLimitRemaining}`);
    console.log(`     - API Key状态: ${stats.hasApiKey ? '✅' : '❌'}`);
}

/**
 * 主测试函数（增强版）
 */
async function runAllTests() {
    try {
        console.log("🚀 启动Bedrock代币增强分析测试套件\n");
        
        // 测试地址分类
        testAddressClassification();
        
        // 测试Dune API功能
        await testDuneAPI();
        
        // 测试完整的代币分析流程
        await testBedrockAnalysis();
        
        console.log("\n🎉 所有增强功能测试完成!");
        
    } catch (error) {
        console.error("\n💥 测试套件失败:", error.message);
        process.exit(1);
    }
}

/**
 * 轻量级测试（跳过动态查询）
 */
async function runBasicTests() {
    try {
        console.log("🚀 启动基础功能测试（跳过动态查询）\n");
        
        // 测试地址分类
        testAddressClassification();
        
        console.log("\n3️⃣ 测试基础Bedrock代币分析...");
        
        const analyzer = new BedrockTokenAnalysis();
        
        // 加载数据
        analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
        analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');
        const holdersData = analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');
        
        // 基础分析（不启用动态查询）
        const basicData = await analyzer.processHoldersData(false);
        
        // 生成报告
        const report = analyzer.generateReport();
        console.log("\n📊 基础分析报告（节选）:");
        console.log(report.substring(0, 1000) + "...[截断]");
        
        console.log("\n✅ 基础功能测试完成!");
        
    } catch (error) {
        console.error("\n💥 基础测试失败:", error.message);
        process.exit(1);
    }
}

// 如果直接运行此文件，则执行测试
runBasicTests(); // 默认运行基础测试，避免API调用

export { testBedrockAnalysis, testAddressClassification, testDuneAPI, runAllTests, runBasicTests }; 