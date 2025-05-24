import { BedrockTokenAnalysis } from '../src/tokenAnalysis.js';

async function runEnhancedAnalysis() {
    console.log("🚀 启动Bedrock代币增强分析（完整版）...\n");
    
    try {
        const analyzer = new BedrockTokenAnalysis();
        
        // 加载本地标签数据
        console.log("📋 加载本地标签数据...");
        const bnbLabels = analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
        const ethLabels = analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');
        console.log(`   ✅ 已加载 ${bnbLabels + ethLabels} 个本地标签`);
        
        // 加载持有者数据
        console.log("\n👥 加载持有者数据...");
        const holdersData = analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');
        
        if (!holdersData) {
            throw new Error("无法加载持有者数据");
        }
        
        // 用户选择分析模式
        console.log("\n🔄 选择分析模式:");
        console.log("   1️⃣ 基础分析 (仅本地标签，速度快)");
        console.log("   2️⃣ 增强分析 (包含动态查询，功能完整)");
        
        // 默认使用基础分析模式（可以通过命令行参数改变）
        const useEnhancedMode = process.argv.includes('--enhanced') || process.argv.includes('-e');
        
        if (useEnhancedMode) {
            console.log("\n🔍 选择: 增强分析模式 (启用Dune API动态查询)");
            console.log("⚠️  注意: 此模式将进行实际API调用，请确保已配置DUNE_API_KEY环境变量");
            console.log("⏳ 预计用时: 10-20分钟 (取决于API速率限制)");
            
            // 启用动态查询的完整分析
            const processedData = await analyzer.processHoldersData(true);
            
            // 生成并显示完整报告
            console.log("\n📊 生成增强分析报告...");
            const report = analyzer.generateReport();
            console.log(report);
            
            // 动态查询统计
            console.log("\n🔍 动态查询详细统计:");
            const dynamicStats = analyzer.getDynamicQueryStats();
            console.log(`   - 动态发现标签数: ${dynamicStats.dynamicLabelsCount}`);
            console.log(`   - API查询缓存: ${dynamicStats.duneAPIStats.cacheSize}`);
            console.log(`   - 剩余API配额: ${dynamicStats.duneAPIStats.rateLimitRemaining}/分钟`);
            
            if (dynamicStats.dynamicLabelsCount > 0) {
                console.log("\n🎯 动态发现的交易所地址:");
                dynamicStats.dynamicLabels.forEach(([address, label], index) => {
                    if (label && label.custodyOwner) {
                        console.log(`   ${index + 1}. ${address.substring(0, 10)}...${address.substring(38)} -> ${label.custodyOwner} (${label.source})`);
                    }
                });
            }
            
        } else {
            console.log("\n📋 选择: 基础分析模式 (仅使用本地标签)");
            console.log("💡 提示: 使用 --enhanced 或 -e 参数启用增强模式");
            
            // 基础分析（不启用动态查询）
            const processedData = await analyzer.processHoldersData(false);
            
            // 生成并显示基础报告
            const report = analyzer.generateReport();
            console.log(report);
        }
        
        // 集中度分析
        console.log("\n📈 持有者集中度分析:");
        const concentration = analyzer.getConcentrationAnalysis();
        Object.entries(concentration).forEach(([key, value]) => {
            console.log(`   ${key}: ${(value.balance / 1e6).toFixed(2)}M BR (${value.percentage}%)`);
        });
        
        // 保存结果
        console.log("\n💾 保存分析结果...");
        const outputDir = useEnhancedMode ? 'enhanced-analysis-results' : 'basic-analysis-results';
        const savedFiles = analyzer.saveResults(outputDir);
        
        console.log(`\n✅ 分析完成! 结果已保存到 ${outputDir}/ 目录`);
        
        // 使用说明
        console.log("\n📖 使用说明:");
        console.log("   - 基础模式: node run_enhanced_analysis.js");
        console.log("   - 增强模式: node run_enhanced_analysis.js --enhanced");
        console.log("   - 环境配置: 复制 .env.example 为 .env 并配置 DUNE_API_KEY");
        
        return analyzer.processedData;
        
    } catch (error) {
        console.error("❌ 分析过程中出现错误:", error.message);
        
        if (error.message.includes('DUNE_API_KEY')) {
            console.log("\n🔑 API Key配置说明:");
            console.log("   1. 访问 https://dune.com/settings/api 申请API Key");
            console.log("   2. 创建 .env 文件并添加: DUNE_API_KEY=your_api_key_here");
            console.log("   3. 或者使用基础模式: node run_enhanced_analysis.js");
        }
        
        console.error(error.stack);
        process.exit(1);
    }
}

// 显示启动信息
console.log("📊 Bedrock Token 增强分析系统");
console.log("===============================");
console.log("🔧 功能特性:");
console.log("   ✅ 本地标签数据分析");
console.log("   ✅ 动态Dune API查询");
console.log("   ✅ 智能地址分类");
console.log("   ✅ 流通供应量计算");
console.log("   ✅ 持有者集中度分析");
console.log("   ✅ Mock数据支持");
console.log("   ✅ 速率限制处理");

runEnhancedAnalysis();