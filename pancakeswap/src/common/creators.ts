// import { log } from "@graphprotocol/graph-ts";
import {
  Address,
  ethereum,
  BigInt,
  log,
  BigDecimal,
} from "@graphprotocol/graph-ts";
import {
  Swap as SwapEvent,
  Token,
  LiquidityPool,
} from "../../generated/schema";
import { Pair as PairTemplate } from "../../generated/templates";
import {
  getOrCreateToken,
  getOrCreateLPToken,
  getLiquidityPool,
} from "./getters";
import { DEFAULT_DECIMALS, BIGDECIMAL_ZERO, BIGINT_ZERO } from "./constants";
import { convertTokenToDecimal } from "./utils";

// 从PairCreated事件发射中创建流动性池。
export function createLiquidityPool(
  event: ethereum.Event,
  poolAddress: string,
  token0Address: string,
  token1Address: string
): void {
  // 创建令牌和令牌跟踪器
  const token0 = getOrCreateToken(event, token0Address);
  const token1 = getOrCreateToken(event, token1Address);

  // LPtoken信息
  const LPtoken = getOrCreateLPToken(poolAddress, token0, token1);

  // 存储pool信息
  const pool = new LiquidityPool(poolAddress);
  pool.name = LPtoken.name;
  pool.symbol = LPtoken.symbol;
  pool.inputTokens = [token0.id, token1.id];
  pool.outputToken = LPtoken.id;
  pool.createdTimestamp = event.block.timestamp;
  pool.createdBlockNumber = event.block.number;
  pool.totalValueLockedUSD = BIGDECIMAL_ZERO;
  pool.cumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;
  pool.cumulativeVolumeUSD = BIGDECIMAL_ZERO;
  pool.inputTokenBalances = [BIGINT_ZERO, BIGINT_ZERO];
  pool.outputTokenSupply = BIGINT_ZERO;
  pool.outputTokenPriceUSD = BIGDECIMAL_ZERO;

  // 根据subgraph.yaml文件中指定的模板创建并跟踪新创建的池合约。
  PairTemplate.create(Address.fromString(poolAddress));

  pool.save();
  token0.save();
  token1.save();
  LPtoken.save();
}

// swap交易数据
export function createSwapHandleVolume(
  event: ethereum.Event,
  to: string,
  sender: string,
  amount0In: BigInt,
  amount1In: BigInt,
  amount0Out: BigInt,
  amount1Out: BigInt
): void {
  if (amount0Out.gt(BIGINT_ZERO) && amount1Out.gt(BIGINT_ZERO)) {
    // 如果有两个非零值的输出令牌，则这是一个无效的交换
    return;
  }
  // 正常交易 POOL信息
  const pool = getLiquidityPool(event.address.toHexString());

  // 获取token信息
  const token0 = getOrCreateToken(event, pool.inputTokens[0]);
  const token1 = getOrCreateToken(event, pool.inputTokens[1]);

  const logIndexI32 = event.logIndex.toI32();
  const transactionHash = event.transaction.hash.toHexString();
  const swap = new SwapEvent(
    transactionHash.concat("-").concat(event.logIndex.toString())
  );
  // 更新交换事件
  swap.hash = transactionHash;
  swap.logIndex = logIndexI32;
  swap.to = to;
  swap.from = sender;
  swap.blockNumber = event.block.number;
  swap.timestamp = event.block.timestamp;

  if (amount1Out.equals(BIGINT_ZERO)) {
    // 购买操作
    swap.type = "buy";
    swap.tokenIn = token1.id;
    swap.tokenOut = token0.id;
    swap.amountIn = amount1In;
    swap.amountOut = amount0Out;
  } else {
    swap.type = "sell";
    swap.tokenIn = token0.id;
    swap.tokenOut = token1.id;
    swap.amountIn = amount0In;
    swap.amountOut = amount1Out;
  }
  swap.tokenPrice = BIGDECIMAL_ZERO;
  swap.pool = pool.id;
  swap.save();
}
