/**
 * 地址过滤工具类
 * 用于识别和分类不同类型的区块链地址
 */
export class AddressFilters {
    constructor() {
        // 销毁地址模式
        this.burnAddressPatterns = [
            /^0x0+$/,                          // 全零地址
            /^0x0+dead$/i,                     // 0x...dead地址
            /^0x0+1$/,                         // 0x...0001地址
            /^0x0+[1-9a-f]$/i,                 // 0x...000x地址 (x为1-f)
            /^0xdead/i,                        // dead开头的地址
            /^0x.*dead.*$/i,                   // 包含dead的地址
            /^0x.*burn.*$/i,                   // 包含burn的地址
        ];

        // 常见的交易所热钱包地址前缀或模式
        this.exchangePatterns = {
            binance: [
                /^0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be$/i,  // Binance 1
                /^0xd551234ae421e3bcba99a0da6d736074f22192ff$/i,  // Binance 2
                /^0x564286362092d8e7936f0549571a803b203aaced$/i,  // Binance 3
                /^0x0681d8db095565fe8a346fa0277bffde9c0edbbf$/i,  // Binance 4
                /^0xfe9e8709d3215310075d67e3ed32a380ccf451c8$/i,  // Binance 5
                /^0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67$/i,  // Binance 6
                /^0xbe0eb53f46cd790cd13851d5eff43d12404d33e8$/i,  // Binance 7
                /^0xf977814e90da44bfa03b6295a0616a897441aceC$/i,  // Binance 8
            ],
            coinbase: [
                /^0x71660c4005ba85c37ccec55d0c4493e66fe775d3$/i,  // Coinbase 1
                /^0x503828976d22510aad0201ac7ec88293211d23da$/i,  // Coinbase 2
                /^0xddfAbCdc4D8FfC6d5beaf154f18B778f892A0740$/i,  // Coinbase 3
                /^0x3cd751e6b0078be393132286c442345e5dc49699$/i,  // Coinbase 4
                /^0xb5d85CBf7cB3EE0D56b3bB207D5Fc4B82f43F511$/i,  // Coinbase 5
                /^0xeb2629a2734e272bcc07bda959863f316f4bd4cf$/i,  // Coinbase 6
            ],
            okex: [
                /^0x236f9f97e0e62388479bf9e5ba4889e46b0273c3$/i,   // OKEx 1
                /^0xa7efae728d2936e78bda97dc267687568dd593f3$/i,   // OKEx 2
                /^0x6cc5f688a315f3dc28a7781717a9a798a59fda7b$/i,   // OKEx 3
            ],
            huobi: [
                /^0xdc76cd25977e0a5ae17155770273ad58648900d3$/i,   // Huobi 1
                /^0xadb2b42f6bd96f5c65920b9ac88619dce4166f94$/i,   // Huobi 2
                /^0xa8660c8ffd6d578f657b72c0c811284aef0b735e$/i,   // Huobi 3
                /^0x1062a747393198f70f71ec65a582423dba7e5ab3$/i,   // Huobi 4
            ],
            kraken: [
                /^0xae2fc483527b8ef99eb5d9b44875f005ba1fae13$/i,   // Kraken 1
                /^0x43984d578803891dfa9706bdeee6078d80cfc79e$/i,   // Kraken 2
                /^0x66c57bf505a85a74609d2c83e94aabb26d691e1f$/i,   // Kraken 3
            ]
        };

        // DeFi协议地址
        this.defiProtocolAddresses = new Set([
            // Uniswap
            "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI Token
            "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f", // Uniswap V2 Factory
            "0x1f98431c8ad98523631ae4a59f267346ea31f984", // Uniswap V3 Factory
            "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", // Uniswap V3 SwapRouter02
            "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router
            "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3 SwapRouter
            "0xc36442b4a4522e871399cd717abdd847ab11fe88", // Uniswap V3 NonfungiblePositionManager
            
            // PancakeSwap (BSC)
            "0x10ed43c718714eb63d5aa57b78b54704e256024e", // PancakeSwap V2 Router
            "0xca143ce32fe78f1f7019d7d551a6402fc5350c73", // PancakeSwap V2 Factory
            "0x0ed7e52944161450477ee417de9cd3a859b14fd0", // PancakeSwap V1 Factory
            "0x05ff2b0db69458a0750badebc4f9e13add608c7f", // PancakeSwap V1 Router
            
            // Compound
            "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b", // Compound Comptroller
            "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", // cDAI
            "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", // cETH
            "0x158079ee67fce2f58472a96584a73c7ab9ac95c1", // cREP
            "0xf5dce57282a584d2746faf1593d3121fcac444dc", // cSAI
            
            // Aave
            "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9", // Aave LendingPool
            "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5", // Aave LendingPoolAddressesProvider
            "0x24a42fd28c976a61df5d00d0599c34c4f90748c8", // Aave LendingPoolAddressesProviderRegistry
            
            // MakerDAO
            "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", // MKR Token
            "0x89b78cfa322f6c5de0abceecab66aee45393cc5a", // MKR Token (old)
            "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b", // VAT
            "0xa950524441892a31ebddf91d3ceefa04bf454466", // MCD_CROPPER
            
            // Curve
            "0xd533a949740bb3306d119cc777fa900ba034cd52", // CRV Token
            "0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2", // Curve Vyper Contract
            "0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27", // Curve sBTC Pool
            
            // Yearn Finance
            "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e", // YFI Token
            "0x5dbcf33d8c2e976c6b560249878e6f1491bca25c", // Curve.fi yDAI/yUSDC/yUSDT/yTUSD
            
            // Balancer
            "0xba100000625a3754423978a60c9317c58a424e3d", // BAL Token
            "0x9424b1412450d0f8fc2255faf6046b98213b76bd", // Balancer Vault
            
            // SushiSwap
            "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2", // SUSHI Token
            "0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac", // SushiSwap Factory
            "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f", // SushiSwap Router
            
            // 1inch
            "0x111111111117dc0aa78b770fa6a738034120c302", // 1inch V4 Router
            "0x11111112542d85b3ef69ae05771c2dccff4faa26", // 1inch V3 Router
            
            // Time locks and vesting contracts (common patterns)
        ]);

        // 时间锁和托管地址模式
        this.timelockPatterns = [
            /timelock/i,
            /vesting/i,
            /escrow/i,
            /multisig/i,
            /treasury/i,
            /reserve/i,
            /foundation/i,
            /team/i,
            /advisor/i,
        ];
    }

    /**
     * 检查是否为销毁地址
     * @param {string} address - 钱包地址
     * @returns {boolean}
     */
    isBurnAddress(address) {
        const lowerAddress = address.toLowerCase();
        
        // 检查精确匹配
        const burnAddresses = [
            "0x0000000000000000000000000000000000000000",
            "0x000000000000000000000000000000000000dead",
            "0x0000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000002",
            "0x0000000000000000000000000000000000000003",
            "0x0000000000000000000000000000000000000004",
            "0x0000000000000000000000000000000000000005",
            "0x0000000000000000000000000000000000000006",
            "0x0000000000000000000000000000000000000007",
            "0x0000000000000000000000000000000000000008",
            "0x0000000000000000000000000000000000000009",
            "0x000000000000000000000000000000000000000a",
            "0x000000000000000000000000000000000000000b",
            "0x000000000000000000000000000000000000000c",
            "0x000000000000000000000000000000000000000d",
            "0x000000000000000000000000000000000000000e",
            "0x000000000000000000000000000000000000000f",
        ];
        
        if (burnAddresses.includes(lowerAddress)) {
            return true;
        }

        // 检查模式匹配
        return this.burnAddressPatterns.some(pattern => pattern.test(lowerAddress));
    }

    /**
     * 检查是否为已知交易所地址
     * @param {string} address - 钱包地址
     * @returns {string|null} 返回交易所名称，如果不是交易所地址则返回null
     */
    getExchangeName(address) {
        const lowerAddress = address.toLowerCase();
        
        for (const [exchangeName, patterns] of Object.entries(this.exchangePatterns)) {
            if (patterns.some(pattern => pattern.test(lowerAddress))) {
                return exchangeName;
            }
        }
        
        return null;
    }

    /**
     * 检查是否为DeFi协议地址
     * @param {string} address - 钱包地址
     * @returns {boolean}
     */
    isDeFiProtocolAddress(address) {
        return this.defiProtocolAddresses.has(address.toLowerCase());
    }

    /**
     * 检查是否可能是时间锁或托管地址
     * @param {string} address - 钱包地址
     * @param {string} label - 地址标签 (如果有)
     * @returns {boolean}
     */
    isTimelockAddress(address, label = '') {
        const lowerAddress = address.toLowerCase();
        const lowerLabel = label.toLowerCase();
        
        // 检查标签中是否包含时间锁相关的关键词
        if (label && this.timelockPatterns.some(pattern => pattern.test(lowerLabel))) {
            return true;
        }
        
        // 检查地址是否匹配已知的时间锁合约模式
        // 这里可以添加更多已知的时间锁合约地址
        const knownTimelockAddresses = [
            "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b", // Example timelock
            // 可以添加更多已知的时间锁地址
        ];
        
        return knownTimelockAddresses.includes(lowerAddress);
    }

    /**
     * 获取地址类型的详细信息
     * @param {string} address - 钱包地址
     * @param {string} label - 地址标签 (如果有)
     * @returns {object} 地址分类信息
     */
    classifyAddress(address, label = '') {
        const classification = {
            address: address,
            label: label,
            type: 'unknown',
            subtype: null,
            description: '',
            shouldExclude: false
        };

        // 检查是否为销毁地址
        if (this.isBurnAddress(address)) {
            classification.type = 'burn';
            classification.description = '销毁地址';
            classification.shouldExclude = true;
            return classification;
        }

        // 检查是否为交易所地址
        const exchangeName = this.getExchangeName(address);
        if (exchangeName) {
            classification.type = 'exchange';
            classification.subtype = exchangeName;
            classification.description = `${exchangeName}交易所地址`;
            classification.shouldExclude = true;
            return classification;
        }

        // 检查是否为DeFi协议地址
        if (this.isDeFiProtocolAddress(address)) {
            classification.type = 'defi';
            classification.description = 'DeFi协议地址';
            classification.shouldExclude = false; // DeFi地址通常不排除，除非特别指定
            return classification;
        }

        // 检查是否为时间锁地址
        if (this.isTimelockAddress(address, label)) {
            classification.type = 'timelock';
            classification.description = '时间锁/托管地址';
            classification.shouldExclude = true;
            return classification;
        }

        // 默认为有效持有者
        classification.type = 'holder';
        classification.description = '普通持有者';
        classification.shouldExclude = false;

        return classification;
    }

    /**
     * 批量分类地址
     * @param {Array} addresses - 地址数组，每个元素包含address和可选的label
     * @returns {Array} 分类结果数组
     */
    classifyAddresses(addresses) {
        return addresses.map(item => {
            const address = typeof item === 'string' ? item : item.address;
            const label = typeof item === 'object' ? item.label || '' : '';
            return this.classifyAddress(address, label);
        });
    }

    /**
     * 添加自定义销毁地址
     * @param {string} address - 地址
     */
    addBurnAddress(address) {
        // 这里可以动态添加自定义的销毁地址
        // 暂时不实现，保持现有结构
    }

    /**
     * 添加自定义交易所地址
     * @param {string} exchangeName - 交易所名称
     * @param {string} address - 地址
     */
    addExchangeAddress(exchangeName, address) {
        if (!this.exchangePatterns[exchangeName.toLowerCase()]) {
            this.exchangePatterns[exchangeName.toLowerCase()] = [];
        }
        this.exchangePatterns[exchangeName.toLowerCase()].push(new RegExp(`^${address.toLowerCase()}$`, 'i'));
    }
}

export default AddressFilters; 