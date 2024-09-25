import { Swap } from "../../generated/templates/Pair/Pair";
import { createSwapHandleVolume } from "../common/creators";

// 处理从池合约发出的交换事件。
export function handleSwap(event: Swap): void {
  // 交易数据
  createSwapHandleVolume(
    event,
    event.params.to.toHexString(),
    event.params.sender.toHexString(),
    event.params.amount0In,
    event.params.amount1In,
    event.params.amount0Out,
    event.params.amount1Out
  );
}
