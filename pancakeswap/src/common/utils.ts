import { BigInt, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { BIGDECIMAL_ONE, BIGDECIMAL_TEN, INT_ZERO, INT_ONE } from "./constants";

// 转换小数
export function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BIGDECIMAL_ONE;
  for (let i = INT_ZERO; i < (decimals as i32); i = i + INT_ONE) {
    bd = bd.times(BIGDECIMAL_TEN);
  }
  return bd;
}

// 将发出的值转换为令牌计数
export function convertTokenToDecimal(
  tokenAmount: BigInt,
  exchangeDecimals: i32
): BigDecimal {
  if (exchangeDecimals == INT_ZERO) {
    return tokenAmount.toBigDecimal();
  }

  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}
