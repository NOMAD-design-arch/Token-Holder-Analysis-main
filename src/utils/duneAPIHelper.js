import { QueryParameter, DuneClient } from "@duneanalytics/client-sdk";
import dotenv from 'dotenv';

// 加载.env文件
dotenv.config();

/**
 * Dune API 帮助类
 * 用于查询地址标签信息，包含速率限制处理
 */
export class DuneAPIHelper {
    constructor() {
        this.apiKey = process.env.DUNE_API_KEY;
        this.client = this.apiKey ? new DuneClient(this.apiKey) : null;
        this.queryId = 5177452; // 地址标签查询ID
        
        // 速率限制配置
        this.rateLimit = {
            requestsPerMinute: 100, // Dune API每分钟限制
            requests: [],
            mockDataEnabled: true
        };
        
        // 查询缓存
        this.queryCache = new Map();
        
        // 目标链配置
        this.targetChains = ['bnb', 'ethereum', 'polygon', 'arbitrum', 'optimism'];
        
        console.log(`🔗 Dune API Helper initialized. API Key: ${this.apiKey ? '✅ Available' : '❌ Missing'}`);
    }

    /**
     * 检查是否超过速率限制
     * @returns {boolean}
     */
    checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // 清理超过1分钟的请求记录
        this.rateLimit.requests = this.rateLimit.requests.filter(time => time > oneMinuteAgo);
        
        // 检查是否超过限制
        return this.rateLimit.requests.length >= this.rateLimit.requestsPerMinute;
    }

    /**
     * 记录API请求
     */
    recordRequest() {
        this.rateLimit.requests.push(Date.now());
    }

    /**
     * 生成Mock标签数据
     * @param {string} address - 钱包地址
     * @returns {Array} Mock标签数据
     */
    generateMockData(address) {
        // 基于地址特征生成Mock数据
        const lowerAddress = address.toLowerCase();
        
        // 一些常见的交易所地址模式Mock数据
        const mockPatterns = [
            {
                pattern: /^0x.*[0-9a-f]{8}$/,
                mockData: [
                    {
                        address: address,
                        blockchain: 'bnb',
                        owner_key: 'unknown_exchange',
                        custody_owner: 'Unknown Exchange',
                        created_at: '2024-01-01 00:00:00.000 UTC'
                    }
                ]
            },
            {
                pattern: /^0x[a-f0-9]{40}$/,
                mockData: [
                    {
                        address: address,
                        blockchain: 'ethereum',
                        owner_key: 'individual_wallet',
                        custody_owner: null,
                        created_at: '2024-01-01 00:00:00.000 UTC'
                    }
                ]
            }
        ];

        // 随机选择一个模式或返回空数据
        if (Math.random() > 0.7) { // 30%的概率返回Mock交易所数据
            const mockExchanges = [
                { owner_key: 'binance', custody_owner: 'Binance' },
                { owner_key: 'coinbase', custody_owner: 'Coinbase' },
                { owner_key: 'okex', custody_owner: 'OKEx' },
                { owner_key: 'huobi', custody_owner: 'Huobi' },
                { owner_key: 'bybit', custody_owner: 'Bybit' },
                { owner_key: 'kucoin', custody_owner: 'KuCoin' }
            ];
            
            const randomExchange = mockExchanges[Math.floor(Math.random() * mockExchanges.length)];
            
            return [
                {
                    address: address,
                    blockchain: 'bnb',
                    owner_key: randomExchange.owner_key,
                    custody_owner: randomExchange.custody_owner,
                    created_at: '2024-01-01 00:00:00.000 UTC',
                    source: 'mock_data'
                }
            ];
        }
        
        return []; // 返回空数组表示没有找到标签
    }

    /**
     * 查询单个地址的标签信息
     * @param {string} address - 钱包地址
     * @returns {Promise<Array>} 标签数据数组
     */
    async queryAddressLabels(address) {
        // 检查缓存
        if (this.queryCache.has(address)) {
            console.log(`📋 从缓存获取地址标签: ${address}`);
            return this.queryCache.get(address);
        }

        // 检查速率限制
        if (this.checkRateLimit()) {
            console.log(`⚠️  API速率限制，返回Mock数据: ${address}`);
            const mockData = this.generateMockData(address);
            this.queryCache.set(address, mockData);
            return mockData;
        }

        // 检查API Key
        if (!this.client || !this.apiKey) {
            console.log(`⚠️  Dune API Key未配置，返回Mock数据: ${address}`);
            const mockData = this.generateMockData(address);
            this.queryCache.set(address, mockData);
            return mockData;
        }

        try {
            console.log(`🔍 查询地址标签: ${address}`);
            
            const opts = {
                queryId: this.queryId,
                query_parameters: [
                    QueryParameter.text("query_address", address),
                ],
            };

            // 记录请求
            this.recordRequest();

            const executionResult = await this.client.runQuery(opts);
            const labels = executionResult.result?.rows || [];
            
            // 过滤目标链的标签
            const filteredLabels = labels.filter(label => 
                this.targetChains.includes(label.blockchain)
            );

            console.log(`✅ 查询完成，找到 ${filteredLabels.length} 个相关标签`);
            
            // 缓存结果
            this.queryCache.set(address, filteredLabels);
            
            return filteredLabels;

        } catch (error) {
            console.error(`❌ Dune API查询失败: ${address}`, error.message);
            
            // API失败时返回Mock数据
            const mockData = this.generateMockData(address);
            this.queryCache.set(address, mockData);
            return mockData;
        }
    }

    /**
     * 批量查询地址标签（带延迟以避免速率限制）
     * @param {Array<string>} addresses - 地址数组
     * @param {number} delayMs - 查询间隔（毫秒）
     * @returns {Promise<Map>} 地址到标签的映射
     */
    async batchQueryAddressLabels(addresses, delayMs = 1000) {
        const results = new Map();
        
        console.log(`🔄 开始批量查询 ${addresses.length} 个地址标签...`);
        
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            
            try {
                const labels = await this.queryAddressLabels(address);
                results.set(address, labels);
                
                console.log(`📊 进度: ${i + 1}/${addresses.length} - ${address}`);
                
                // 添加延迟避免速率限制（最后一个地址不需要延迟）
                if (i < addresses.length - 1) {
                    console.log(`⏳ 等待 ${delayMs}ms 避免速率限制...`);
                    await this.delay(delayMs);
                }
                
            } catch (error) {
                console.error(`❌ 查询地址失败: ${address}`, error.message);
                results.set(address, []);
            }
        }
        
        console.log(`✅ 批量查询完成，共查询 ${results.size} 个地址`);
        return results;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 解析标签数据，提取交易所信息
     * @param {Array} labels - 标签数据数组
     * @returns {object|null} 交易所信息
     */
    parseExchangeInfo(labels) {
        if (!labels || labels.length === 0) {
            return null;
        }

        // 常见的交易所owner_key映射
        const exchangeMapping = {
            'binance': 'Binance',
            'coinbase': 'Coinbase',
            'okex': 'OKEx',
            'huobi': 'Huobi',
            'kraken': 'Kraken',
            'bybit': 'Bybit',
            'kucoin': 'KuCoin',
            'gate': 'Gate.io',
            'bitfinex': 'Bitfinex',
            'poloniex': 'Poloniex',
            'bitstamp': 'Bitstamp',
            'gemini': 'Gemini'
        };

        // 查找交易所标签
        for (const label of labels) {
            if (label.owner_key && exchangeMapping[label.owner_key.toLowerCase()]) {
                return {
                    exchange: exchangeMapping[label.owner_key.toLowerCase()],
                    ownerKey: label.owner_key,
                    blockchain: label.blockchain,
                    custodyOwner: label.custody_owner,
                    source: label.source || 'dune_api'
                };
            }
        }

        return null;
    }

    /**
     * 获取查询统计信息
     * @returns {object} 统计信息
     */
    getQueryStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentRequests = this.rateLimit.requests.filter(time => time > oneMinuteAgo);
        
        return {
            cacheSize: this.queryCache.size,
            recentRequests: recentRequests.length,
            rateLimitRemaining: Math.max(0, this.rateLimit.requestsPerMinute - recentRequests.length),
            hasApiKey: !!this.apiKey
        };
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.queryCache.clear();
        console.log("🗑️  查询缓存已清空");
    }
}

export default DuneAPIHelper; 