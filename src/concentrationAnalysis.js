/**
 * @fileoverview Token集中度分析模块
 * 实现Token持有者集中度的全面分析，包括Top N分析、HHI指数计算等
 */

/**
 * Token集中度分析类
 * 提供多维度的集中度风险评估
 */
class ConcentrationAnalysis {
    /**
     * 构造函数
     * @param {Array} validHolders - 有效持有者数组，每个元素包含 {address, balance, percentage} 
     * @param {number} totalCirculatingSupply - 总流通供应量
     */
    constructor(validHolders, totalCirculatingSupply) {
        /** @type {Array<Object>} 有效持有者数据 */
        this.validHolders = validHolders.sort((a, b) => b.balance - a.balance);
        
        /** @type {number} 总流通供应量 */
        this.totalCirculatingSupply = totalCirculatingSupply;
        
        /** @type {number} 大户持有阈值（5%） */
        this.whaleThreshold = 5.0;
        
        /** @type {Object} 分析结果缓存 */
        this.analysisCache = null;
    }

    /**
     * 计算Top N持有者的合计份额
     * @param {number} n - Top N数量
     * @returns {Object} 包含balance、percentage、holders的对象
     */
    calculateTopNShare(n) {
        if (n <= 0 || n > this.validHolders.length) {
            return {
                balance: 0,
                percentage: 0,
                holders: [],
                count: 0
            };
        }

        const topNHolders = this.validHolders.slice(0, n);
        const totalBalance = topNHolders.reduce((sum, holder) => sum + holder.balance, 0);
        const percentage = (totalBalance / this.totalCirculatingSupply) * 100;

        return {
            balance: totalBalance,
            percentage: percentage,
            holders: topNHolders,
            count: n
        };
    }

    /**
     * 计算Herfindahl-Hirschman Index (HHI)
     * HHI = Σ(Pi²) 其中Pi是每个持有者的市场份额百分比
     * @returns {Object} HHI值和风险等级
     */
    calculateHHI() {
        let hhi = 0;
        
        // 计算每个持有者份额的平方和
        this.validHolders.forEach(holder => {
            const percentage = (holder.balance / this.totalCirculatingSupply) * 100;
            hhi += Math.pow(percentage, 2);
        });

        // 确定风险等级
        let riskLevel, riskDescription;
        if (hhi < 1500) {
            riskLevel = "低风险";
            riskDescription = "持有权分散，市场稳定性较好";
        } else if (hhi < 2500) {
            riskLevel = "中等风险";
            riskDescription = "存在一定集中度，需要关注大户动向";
        } else {
            riskLevel = "高风险";
            riskDescription = "持有权高度集中，存在操控风险";
        }

        return {
            value: hhi,
            riskLevel: riskLevel,
            riskDescription: riskDescription,
            maxPossible: 10000,
            normalized: (hhi / 10000) * 100 // 归一化为百分比
        };
    }

    /**
     * 标记持有超过阈值的大户地址
     * @param {number} threshold - 持有阈值百分比，默认5%
     * @returns {Array} 大户地址信息数组
     */
    flagWhaleAddresses(threshold = this.whaleThreshold) {
        const whales = [];
        
        this.validHolders.forEach((holder, index) => {
            const percentage = (holder.balance / this.totalCirculatingSupply) * 100;
            
            if (percentage >= threshold) {
                whales.push({
                    rank: index + 1,
                    address: holder.address,
                    balance: holder.balance,
                    percentage: percentage,
                    riskLevel: this.getWhaleRiskLevel(percentage),
                    balanceFormatted: this.formatBalance(holder.balance)
                });
            }
        });

        return whales;
    }

    /**
     * 根据持有比例确定大户风险等级
     * @param {number} percentage - 持有百分比
     * @returns {string} 风险等级
     */
    getWhaleRiskLevel(percentage) {
        if (percentage >= 20) return "极高风险";
        if (percentage >= 10) return "高风险";
        if (percentage >= 5) return "中等风险";
        return "低风险";
    }

    /**
     * 格式化余额显示
     * @param {number} balance - 原始余额
     * @returns {string} 格式化的余额字符串
     */
    formatBalance(balance) {
        if (balance >= 1e9) {
            return `${(balance / 1e9).toFixed(2)}B`;
        } else if (balance >= 1e6) {
            return `${(balance / 1e6).toFixed(2)}M`;
        } else if (balance >= 1e3) {
            return `${(balance / 1e3).toFixed(2)}K`;
        } else {
            return balance.toFixed(2);
        }
    }

    /**
     * 计算基尼系数（衡量不平等程度的指标）
     * @returns {Object} 基尼系数和解释
     */
    calculateGiniCoefficient() {
        const n = this.validHolders.length;
        const balances = this.validHolders.map(holder => holder.balance).sort((a, b) => a - b);
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (2 * (i + 1) - n - 1) * balances[i];
            denominator += balances[i];
        }
        
        const gini = numerator / (n * denominator);
        
        let interpretation;
        if (gini < 0.3) {
            interpretation = "相对平等";
        } else if (gini < 0.5) {
            interpretation = "中等不平等";
        } else if (gini < 0.7) {
            interpretation = "高度不平等";
        } else {
            interpretation = "极度不平等";
        }

        return {
            value: gini,
            interpretation: interpretation,
            scale: "0-1 (0=完全平等, 1=完全不平等)"
        };
    }

    /**
     * 执行全面的集中度分析
     * @returns {Object} 完整的分析结果
     */
    performFullAnalysis() {
        if (this.analysisCache) {
            return this.analysisCache;
        }

        console.log("🔄 开始执行集中度分析...");

        // 1. Top N持有者分析
        const topAnalysis = {
            top1: this.calculateTopNShare(1),
            top5: this.calculateTopNShare(5),
            top10: this.calculateTopNShare(10),
            top20: this.calculateTopNShare(20),
            top50: this.calculateTopNShare(50),
            top100: this.calculateTopNShare(100)
        };

        // 2. HHI分析
        const hhiAnalysis = this.calculateHHI();

        // 3. 大户标记
        const whales = this.flagWhaleAddresses();

        // 4. 基尼系数
        const giniAnalysis = this.calculateGiniCoefficient();

        // 5. 综合风险评估
        const overallRisk = this.assessOverallRisk(hhiAnalysis, whales, giniAnalysis);

        // 6. 集中度趋势分析
        const trends = this.analyzeTrends();

        const result = {
            summary: {
                totalHolders: this.validHolders.length,
                totalCirculatingSupply: this.totalCirculatingSupply,
                analysisTimestamp: new Date().toISOString()
            },
            topHoldersAnalysis: topAnalysis,
            hhiAnalysis: hhiAnalysis,
            whaleAnalysis: {
                threshold: this.whaleThreshold,
                whales: whales,
                totalWhales: whales.length,
                whalesSharePercentage: whales.reduce((sum, whale) => sum + whale.percentage, 0)
            },
            giniAnalysis: giniAnalysis,
            overallRisk: overallRisk,
            trends: trends
        };

        this.analysisCache = result;
        console.log("✅ 集中度分析完成");
        return result;
    }

    /**
     * 评估整体风险等级
     * @param {Object} hhiAnalysis - HHI分析结果
     * @param {Array} whales - 大户数组
     * @param {Object} giniAnalysis - 基尼系数分析
     * @returns {Object} 整体风险评估
     */
    assessOverallRisk(hhiAnalysis, whales, giniAnalysis) {
        let riskScore = 0;
        const riskFactors = [];

        // HHI风险评分
        if (hhiAnalysis.value >= 2500) {
            riskScore += 40;
            riskFactors.push("HHI指数显示高集中度");
        } else if (hhiAnalysis.value >= 1500) {
            riskScore += 25;
            riskFactors.push("HHI指数显示中等集中度");
        } else {
            riskScore += 10;
        }

        // 大户风险评分
        const extremeWhales = whales.filter(w => w.percentage >= 10).length;
        const normalWhales = whales.filter(w => w.percentage >= 5 && w.percentage < 10).length;
        
        riskScore += extremeWhales * 20;
        riskScore += normalWhales * 10;

        if (extremeWhales > 0) {
            riskFactors.push(`${extremeWhales}个地址持有超过10%`);
        }
        if (normalWhales > 0) {
            riskFactors.push(`${normalWhales}个地址持有5-10%`);
        }

        // 基尼系数风险评分
        if (giniAnalysis.value >= 0.7) {
            riskScore += 30;
            riskFactors.push("基尼系数显示极度不平等");
        } else if (giniAnalysis.value >= 0.5) {
            riskScore += 20;
            riskFactors.push("基尼系数显示高度不平等");
        } else if (giniAnalysis.value >= 0.3) {
            riskScore += 10;
        }

        // 确定整体风险等级
        let overallLevel, recommendation;
        if (riskScore >= 80) {
            overallLevel = "极高风险";
            recommendation = "强烈建议谨慎投资，存在严重的集中度风险";
        } else if (riskScore >= 60) {
            overallLevel = "高风险";
            recommendation = "建议密切关注大户动向，存在显著风险";
        } else if (riskScore >= 40) {
            overallLevel = "中等风险";
            recommendation = "需要定期监控集中度变化";
        } else if (riskScore >= 20) {
            overallLevel = "低风险";
            recommendation = "集中度相对健康，风险可控";
        } else {
            overallLevel = "很低风险";
            recommendation = "持有分布良好，集中度风险很低";
        }

        return {
            riskScore: riskScore,
            level: overallLevel,
            recommendation: recommendation,
            riskFactors: riskFactors
        };
    }

    /**
     * 分析集中度趋势（基础版本，需要历史数据支持）
     * @returns {Object} 趋势分析结果
     */
    analyzeTrends() {
        // 这里是基础实现，实际应用中需要历史数据
        return {
            note: "趋势分析需要历史数据支持",
            currentSnapshot: {
                timestamp: new Date().toISOString(),
                topHolderPercentage: this.validHolders.length > 0 ? 
                    (this.validHolders[0].balance / this.totalCirculatingSupply) * 100 : 0,
                top10Percentage: this.calculateTopNShare(10).percentage
            }
        };
    }

    /**
     * 生成集中度分析报告
     * @returns {string} 格式化的分析报告
     */
    generateReport() {
        const analysis = this.performFullAnalysis();
        
        let report = "\n" + "=".repeat(80) + "\n";
        report += "🎯 TOKEN集中度风险分析报告\n";
        report += "=".repeat(80) + "\n";
        
        // 基本信息
        report += `\n📊 基本信息:\n`;
        report += `   • 总持有者数量: ${analysis.summary.totalHolders.toLocaleString()}\n`;
        report += `   • 流通供应量: ${this.formatBalance(analysis.summary.totalCirculatingSupply)}\n`;
        report += `   • 分析时间: ${new Date(analysis.summary.analysisTimestamp).toLocaleString()}\n`;

        // Top N持有者分析
        report += `\n🏆 Top持有者集中度分析:\n`;
        Object.entries(analysis.topHoldersAnalysis).forEach(([key, data]) => {
            if (data.count > 0) {
                report += `   • ${key.toUpperCase()}: ${this.formatBalance(data.balance)} (${data.percentage.toFixed(2)}%)\n`;
            }
        });

        // HHI分析
        report += `\n📈 Herfindahl-Hirschman Index (HHI) 分析:\n`;
        report += `   • HHI值: ${analysis.hhiAnalysis.value.toFixed(2)}\n`;
        report += `   • 风险等级: ${analysis.hhiAnalysis.riskLevel}\n`;
        report += `   • 风险描述: ${analysis.hhiAnalysis.riskDescription}\n`;
        report += `   • 集中度百分比: ${analysis.hhiAnalysis.normalized.toFixed(2)}%\n`;

        // 大户分析
        report += `\n🐋 大户(>5%)分析:\n`;
        report += `   • 大户数量: ${analysis.whaleAnalysis.totalWhales}\n`;
        report += `   • 大户总持有: ${analysis.whaleAnalysis.whalesSharePercentage.toFixed(2)}%\n`;
        
        if (analysis.whaleAnalysis.whales.length > 0) {
            report += `   • 大户详情:\n`;
            analysis.whaleAnalysis.whales.forEach(whale => {
                report += `     - 排名${whale.rank}: ${whale.address.substring(0,8)}...${whale.address.substring(38)} `;
                report += `${whale.balanceFormatted} (${whale.percentage.toFixed(2)}%) [${whale.riskLevel}]\n`;
            });
        }

        // 基尼系数
        report += `\n⚖️ 基尼系数分析:\n`;
        report += `   • 基尼系数: ${analysis.giniAnalysis.value.toFixed(4)}\n`;
        report += `   • 不平等程度: ${analysis.giniAnalysis.interpretation}\n`;
        report += `   • 评分标准: ${analysis.giniAnalysis.scale}\n`;

        // 整体风险评估
        report += `\n🚨 整体风险评估:\n`;
        report += `   • 风险评分: ${analysis.overallRisk.riskScore}/100\n`;
        report += `   • 风险等级: ${analysis.overallRisk.level}\n`;
        report += `   • 投资建议: ${analysis.overallRisk.recommendation}\n`;
        
        if (analysis.overallRisk.riskFactors.length > 0) {
            report += `   • 风险因素:\n`;
            analysis.overallRisk.riskFactors.forEach(factor => {
                report += `     - ${factor}\n`;
            });
        }

        report += "\n" + "=".repeat(80) + "\n";
        
        return report;
    }

    /**
     * 获取分析结果的JSON格式
     * @returns {Object} JSON格式的分析结果
     */
    getAnalysisJSON() {
        return this.performFullAnalysis();
    }
}

export { ConcentrationAnalysis };
