import { BedrockTokenAnalysis } from '../src/tokenAnalysis.js';

async function runAnalysis() {
    console.log("🚀 启动Bedrock代币分析...\n");
    
    try {
        const analyzer = new BedrockTokenAnalysis();
        
        // 加载标签数据
        console.log("📋 加载标签数据...");
        const bnbLabels = analyzer.loadLabels('label/bnb_query_5176963_2025-05-23T06-35-39-736Z.json');
        const ethLabels = analyzer.loadLabels('label/ethereum_query_5174062_2025-05-23T06-29-04-809Z.json');
        
        // 加载持有者数据
        console.log("\n👥 加载持有者数据...");
        const holdersData = analyzer.loadHoldersData('holders/token_holders_bsc-mainnet_2025-05-24T06-05-04-088Z.json');
        
        if (!holdersData) {
            throw new Error("无法加载持有者数据");
        }
        
        // 处理数据
        console.log("\n🔄 处理和分析数据...");
        const processedData = analyzer.processHoldersData();
        
        // 生成并显示报告
        console.log("\n📊 生成分析报告...");
        const report = analyzer.generateReport();
        console.log(report);
        
        // 集中度分析
        console.log("\n📈 持有者集中度分析:");
        const concentration = analyzer.getConcentrationAnalysis();
        Object.entries(concentration).forEach(([key, value]) => {
            console.log(`   ${key}: ${(value.balance / 1e6).toFixed(2)}M BR (${value.percentage}%)`);
        });
        
        // 保存结果
        console.log("\n💾 保存分析结果...");
        const savedFiles = analyzer.saveResults();
        
        console.log("\n✅ 分析完成!");
        
    } catch (error) {
        console.error("❌ 分析过程中出现错误:", error.message);
    }
}

runAnalysis(); 