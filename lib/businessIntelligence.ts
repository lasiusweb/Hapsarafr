
import { FarmPlotModel, ProductModel, DealerInventorySignalModel, OrderModel, OrderItemModel, VendorProductModel, FarmerModel } from '../db';
import { farmPlotModelToPlain, farmerModelToPlain } from './utils';
import { Farmer, Product } from '../types';
import { getMockWeatherData } from './climateEngine';

// --- Types ---
interface PredictionResult {
    productId: string;
    productName: string;
    category: string;
    predictedQuantity: number;
    unit: string;
    confidence: number; // 0 to 1
    reasoning: string;
    stockStatus: 'OK' | 'LOW' | 'CRITICAL_OUT';
    gap: number;
}

export interface CustomerSegment {
    id: string;
    label: string;
    description: string;
    farmers: Farmer[];
    avgSpend: number;
    color: string;
    icon: string;
    suggestedAction: string;
}

export interface BundleOpportunity {
    id: string;
    products: Product[];
    frequency: number;
    description: string;
    suggestedDiscount: number;
    potentialRevenue: number;
}

export interface SalesTrend {
    period: string;
    revenue: number;
    count: number;
}

// --- Core Logic ---

/**
 * Inventory Demand Forecasting Engine
 * Combines Crop Lifecycle + Weather Forecasts + Historical Data
 */
export const getInventoryPredictions = (
    plots: FarmPlotModel[], 
    products: ProductModel[],
    inventorySignals: DealerInventorySignalModel[] = [] 
): PredictionResult[] => {
    const now = new Date();
    const predictions: PredictionResult[] = [];
    
    // 1. Calculate Total Acreage by Age Cohort
    let gestationAcreage = 0; // < 4 years (Needs growth inputs)
    let matureAcreage = 0;    // > 4 years (Needs yield inputs)

    plots.forEach(plotModel => {
        const plot = farmPlotModelToPlain(plotModel);
        if (!plot || !plot.plantation_date) return;
        
        const plantationDate = new Date(plot.plantation_date);
        const ageInYears = (now.getTime() - plantationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (ageInYears < 4) {
            gestationAcreage += plot.acreage;
        } else {
            matureAcreage += plot.acreage;
        }
    });

    // 2. Check Weather (Ground Reality Trigger)
    // If rain is forecast, farmers apply Urea/Fertilizer immediately.
    const weather = getMockWeatherData();
    const isRainForecast = weather.rainfallMm > 10 || (weather.forecast && weather.forecast.some(d => d.rainfallMm > 15));

    // Helper to get current stock
    const getStock = (prodId: string) => {
        const signal = inventorySignals.find(s => s.productId === prodId);
        return signal ? signal.stockQuantity || 0 : 0;
    };

    const evaluateStock = (demand: number, stock: number) : 'OK' | 'LOW' | 'CRITICAL_OUT' => {
        if (stock <= 0) return 'CRITICAL_OUT';
        if (stock < demand * 0.5) return 'LOW'; // Less than 50% of predicted demand covered
        return 'OK';
    }

    // 3. Heuristic Rules

    // Rule A: Urea (Nitrogen) Demand
    // Logic: Young palms need N for growth. Mature need it for yield. Rain increases application probability.
    const ureaProduct = products.find(p => p.name.toLowerCase().includes('urea'));
    if (ureaProduct) {
        // Base demand: 50kg/ac for young, 100kg/ac for mature (per season proxy)
        let baseDemand = Math.round((gestationAcreage * 50) + (matureAcreage * 100));
        let reasoning = `Base demand for ${gestationAcreage.toFixed(1)}ac young & ${matureAcreage.toFixed(1)}ac mature palms.`;
        let confidence = 0.85;

        if (isRainForecast) {
            baseDemand = Math.round(baseDemand * 1.4); // 40% surge if raining
            reasoning += " +40% SURGE due to Rain Forecast (Ideal application window).";
            confidence = 0.95;
        }

        if (baseDemand > 0) {
            const stock = getStock((ureaProduct as any).id);
            predictions.push({
                productId: (ureaProduct as any).id,
                productName: ureaProduct.name,
                category: 'Fertilizer',
                predictedQuantity: baseDemand,
                unit: 'kg',
                confidence: confidence, 
                reasoning: reasoning,
                stockStatus: evaluateStock(baseDemand, stock),
                gap: Math.max(0, baseDemand - stock)
            });
        }
    }

    // Rule B: Harvesting Tools (Sickles/Chisels)
    // Logic: Linked purely to mature acreage.
    const toolProduct = products.find(p => p.name.toLowerCase().includes('sickle') || p.name.toLowerCase().includes('cutter'));
    if (toolProduct && matureAcreage > 0) {
        const demand = Math.ceil(matureAcreage / 15); // 1 sickle per 15 acres replacement
        if (demand > 0) {
            const stock = getStock((toolProduct as any).id);
             predictions.push({
                productId: (toolProduct as any).id,
                productName: toolProduct.name,
                category: 'Tools',
                predictedQuantity: demand,
                unit: 'units',
                confidence: 0.6,
                reasoning: `Replacement demand estimated for ${matureAcreage.toFixed(1)} active harvest acres.`,
                stockStatus: evaluateStock(demand, stock),
                gap: Math.max(0, demand - stock)
            });
        }
    }

    // Rule C: Boron / Micro-nutrients (Gestation focus)
    // Logic: Young palms in sandy soils need Boron.
    const boronProduct = products.find(p => p.name.toLowerCase().includes('boron') || p.name.toLowerCase().includes('micro'));
    if (boronProduct && gestationAcreage > 0) {
        const demand = Math.round(gestationAcreage * 2); // 2kg/acre estimate
        if (demand > 0) {
             const stock = getStock((boronProduct as any).id);
             predictions.push({
                productId: (boronProduct as any).id,
                productName: boronProduct.name,
                category: 'Fertilizer',
                predictedQuantity: demand,
                unit: 'kg',
                confidence: 0.6, 
                reasoning: `Essential micronutrient requirement for young palms (prevent hook leaf).`,
                stockStatus: evaluateStock(demand, stock),
                gap: Math.max(0, demand - stock)
            });
        }
    }

    return predictions.sort((a, b) => b.gap - a.gap); // Prioritize big gaps
};

/**
 * RFM (Recency, Frequency, Monetary) Analysis for Farmers
 */
export const getCustomerSegments = (
    farmers: FarmerModel[],
    orders: OrderModel[]
): CustomerSegment[] => {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    // 1. Aggregate Stats
    const farmerStats: Record<string, { count: number, totalSpend: number, lastOrderDate: Date | null }> = {};

    farmers.forEach(f => {
        farmerStats[(f as any).id] = { count: 0, totalSpend: 0, lastOrderDate: null };
    });

    orders.forEach(o => {
        const fid = o.farmerId;
        if (farmerStats[fid]) {
            const stats = farmerStats[fid];
            stats.count += 1;
            stats.totalSpend += o.totalAmount;
            const orderDate = new Date(o.orderDate);
            if (!stats.lastOrderDate || orderDate > stats.lastOrderDate) {
                stats.lastOrderDate = orderDate;
            }
        }
    });

    const segments: Record<string, CustomerSegment> = {
        'WHALES': {
            id: 'WHALES',
            label: 'High Value (Whales)',
            description: 'Top spenders (> ₹50k). Prioritize VIP service.',
            farmers: [],
            avgSpend: 0,
            color: 'bg-purple-100 text-purple-800 border-purple-200',
            icon: '👑',
            suggestedAction: 'Offer Bulk Discount / Priority Delivery'
        },
        'LOYALISTS': {
            id: 'LOYALISTS',
            label: 'Loyal Regulars',
            description: 'Frequent buyers (> 5 orders). Keep engaged.',
            farmers: [],
            avgSpend: 0,
            color: 'bg-green-100 text-green-800 border-green-200',
            icon: '🌟',
            suggestedAction: 'Send Loyalty Reward'
        },
        'DORMANT': {
            id: 'DORMANT',
            label: 'At Risk (Dormant)',
            description: 'No purchase in 6 months. Needs re-activation.',
            farmers: [],
            avgSpend: 0,
            color: 'bg-red-100 text-red-800 border-red-200',
            icon: '💤',
            suggestedAction: 'Send "We Miss You" Coupon'
        },
        'PROSPECTS': {
            id: 'PROSPECTS',
            label: 'New Prospects',
            description: 'Registered but zero orders. Convert them.',
            farmers: [],
            avgSpend: 0,
            color: 'bg-blue-100 text-blue-800 border-blue-200',
            icon: '🌱',
            suggestedAction: 'Send First-Time Buyer Offer'
        }
    };

    // 2. Assign
    farmers.forEach(fModel => {
        const stats = farmerStats[(fModel as any).id];
        const farmer = farmerModelToPlain(fModel)!;

        if (stats.totalSpend > 50000) {
            segments['WHALES'].farmers.push(farmer);
        } else if (stats.count > 5) {
            segments['LOYALISTS'].farmers.push(farmer);
        } else if (stats.count > 0 && stats.lastOrderDate && stats.lastOrderDate < sixMonthsAgo) {
            segments['DORMANT'].farmers.push(farmer);
        } else if (stats.count === 0) {
            segments['PROSPECTS'].farmers.push(farmer);
        }
    });

    return Object.values(segments)
        .map(seg => {
            const total = seg.farmers.reduce((sum, f) => sum + farmerStats[f.id].totalSpend, 0);
            seg.avgSpend = seg.farmers.length > 0 ? total / seg.farmers.length : 0;
            return seg;
        })
        .filter(s => s.farmers.length > 0);
};

/**
 * Market Basket Analysis (Apriori simplified)
 * Finds products often purchased together.
 */
export const analyzeMarketBasket = (
    orders: OrderModel[],
    orderItems: OrderItemModel[],
    vendorProducts: VendorProductModel[],
    products: ProductModel[]
): BundleOpportunity[] => {
    
    const baskets: Record<string, Set<string>> = {};
    const vpMap = new Map(vendorProducts.map(vp => [(vp as any).id, vp.productId]));
    const pMap = new Map(products.map(p => [(p as any).id, (p as any)._raw as unknown as Product]));
    
    orderItems.forEach(item => {
        const orderId = item.orderId;
        const productId = vpMap.get(item.vendorProductId);
        
        if (orderId && productId) {
            if (!baskets[orderId]) baskets[orderId] = new Set();
            baskets[orderId].add(productId);
        }
    });
    
    const pairCounts: Record<string, number> = {};
    let totalTransactions = 0;

    Object.values(baskets).forEach(basket => {
        const items = Array.from(basket);
        if (items.length > 1) {
            totalTransactions++;
            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const pair = [items[i], items[j]].sort().join('|');
                    pairCounts[pair] = (pairCounts[pair] || 0) + 1;
                }
            }
        }
    });

    const bundles: BundleOpportunity[] = [];
    const minSupport = Math.max(2, Math.floor(totalTransactions * 0.1)); 

    Object.entries(pairCounts).forEach(([pairKey, count]) => {
        if (count >= minSupport) {
            const [p1Id, p2Id] = pairKey.split('|');
            const p1 = pMap.get(p1Id);
            const p2 = pMap.get(p2Id);
            
            if (p1 && p2) {
                bundles.push({
                    id: `bundle_${pairKey}`,
                    products: [p1, p2],
                    frequency: count,
                    description: `Customers often buy ${p1.name} with ${p2.name} (${Math.round((count/totalTransactions)*100)}% overlap).`,
                    suggestedDiscount: 5,
                    potentialRevenue: 0
                });
            }
        }
    });
    
    // Fallback for demo if no transactions
    if (bundles.length === 0) {
         const fertilizers = products.filter(p => p.categoryId.includes('fertilizer') || p.name.includes('Fertilizer'));
         if (fertilizers.length >= 2) {
              bundles.push({
                id: 'bundle_suggest_1',
                products: [fertilizers[0] as unknown as Product, fertilizers[1] as unknown as Product],
                frequency: 0,
                description: 'Suggested: Bundle primary nutrients for higher AOV.',
                suggestedDiscount: 5,
                potentialRevenue: 0
            });
         }
    }

    return bundles.sort((a, b) => b.frequency - a.frequency).slice(0, 3);
};

export const getSalesTrends = (
    orders: OrderModel[],
    orderItems: OrderItemModel[],
    vendorProducts: VendorProductModel[],
    vendorId: string
): SalesTrend[] => {
    const myVendorProductIds = new Set(vendorProducts.filter(vp => vp.vendorId === vendorId).map(vp => (vp as any).id));
    const myItems = orderItems.filter(item => myVendorProductIds.has(item.vendorProductId));
    
    const orderRevenueMap: Record<string, number> = {};
    myItems.forEach(item => {
        orderRevenueMap[item.orderId] = (orderRevenueMap[item.orderId] || 0) + (item.quantity * item.pricePerUnit);
    });
    
    const today = new Date();
    const trends: SalesTrend[] = [];
    
    for(let i=5; i>=0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        trends.push({ period: key, revenue: 0, count: 0 });
    }
    
    orders.forEach(o => {
        const revenue = orderRevenueMap[(o as any).id];
        if (revenue && revenue > 0) {
            const d = new Date(o.orderDate);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            const trend = trends.find(t => t.period === key);
            if (trend) {
                trend.revenue += revenue;
                trend.count += 1;
            }
        }
    });
    
    return trends;
}
