import { PairCreated as PairCreatedEvent } from "../../generated/Factory/Factory";
import { log } from "@graphprotocol/graph-ts";
import { createLiquidityPool } from "../common/creators";

//处理从工厂合同创建新的流动性池的事件
//使用subgraph.yaml中指定的模板创建池实体并跟踪新池合约中的事件
export function handlePairCreated(event: PairCreatedEvent): void {
  log.info("create pair {}    {}     {}", [
    event.params.pair.toHexString(),
    event.params.token0.toHexString(),
    event.params.token1.toHexString(),
  ]);
  createLiquidityPool(
    event,
    event.params.pair.toHexString(),
    event.params.token0.toHexString(),
    event.params.token1.toHexString()
  );
}
