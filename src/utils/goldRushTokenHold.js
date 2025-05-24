import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载.env文件
dotenv.config();

const ApiServices = async () => {
    try {
        const chainName = "bsc-mainnet";
        const tokenAddress = "0xFf7d6A96ae471BbCD7713aF9CB1fEeB16cf56B41";
        const apiKey = process.env.COVALENT_API_KEY;
        
        console.log("正在获取代币持有者数据...");
        
        const options = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        };

        const url = `https://api.covalenthq.com/v1/${chainName}/tokens/${tokenAddress}/token_holders_v2/?page-size=100`;
        console.log("请求URL:", url);
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log("API响应状态:", response.status);
        console.log("获取到数据:", data);
        
        if (data) {
            // 确保label文件夹存在
            const holderslDir = 'holders';
            if (!fs.existsSync(holderslDir)) {
                fs.mkdirSync(holderslDir, { recursive: true });
                console.log(`已创建文件夹: ${holderslDir}`);
            }
            
            // 生成文件名（包含时间戳）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `token_holders_${chainName}_${timestamp}.json`;
            const filePath = path.join(holderslDir, fileName);
            
            // 将数据保存为JSON文件
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`代币持有者数据已保存到: ${filePath}`);
            
            if (data.data && data.data.items && Array.isArray(data.data.items)) {
                console.log(`共保存 ${data.data.items.length} 个持有者记录`);
            } else if (data.items && Array.isArray(data.items)) {
                console.log(`共保存 ${data.items.length} 个持有者记录`);
            }
        } else {
            console.log("API没有返回有效数据");
        }
        
    } catch (error) {
        console.error("API调用失败:", error.message);
        console.error("错误详情:", error);
    }
};

ApiServices();