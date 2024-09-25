// import { log } from "@graphprotocol/graph-ts";
import { Address, ethereum } from "@graphprotocol/graph-ts";
import { Token, LiquidityPool } from "../../generated/schema";
import { DEFAULT_DECIMALS, BIGDECIMAL_ZERO, BIGINT_ZERO } from "./constants";
import { TokenABI as ERC20 } from "../../generated/Factory/TokenABI";
import { ERC20 as ERC20Template } from "../../generated/templates";

export function getOrCreateToken(
  event: ethereum.Event,
  address: string
): Token {
  // 取token信息
  let token = Token.load(address);
  // token不存在新建
  if (!token) {
    token = new Token(address);
    let name = "1";
    let symbol = "1";
    let decimals = DEFAULT_DECIMALS;

    // 创建erc20合约实例
    // const erc20Contract = ERC20.bind(Address.fromString(address));
    // const nameCall = erc20Contract.try_name();
    // if (!nameCall.reverted) name = nameCall.value;
    // const symbolCall = erc20Contract.try_symbol();
    // if (!symbolCall.reverted) symbol = symbolCall.value;
    // const decimalsCall = erc20Contract.try_decimals();
    // if (!decimalsCall.reverted) decimals = decimalsCall.value;

    // 赋值
    token.name = name;
    token.symbol = symbol;
    token.decimals = decimals;
    // token.holders = [];

    // 增加
    token.save();
    // ERC20纳入事件
    ERC20Template.create(Address.fromString(address));
  }

  return token as Token;
}

export function getOrCreateLPToken(
  tokenAddress: string,
  token0: Token,
  token1: Token
): Token {
  let token = Token.load(tokenAddress);
  // 如果为空，则获取信息
  if (token === null) {
    token = new Token(tokenAddress);
    token.symbol = token0.symbol + "/" + token1.symbol;
    token.name = token0.name + "/" + token1.name + " LP";
    token.decimals = DEFAULT_DECIMALS;
    // token.holders = [];
    token.save();
  }
  return token;
}

export function getLiquidityPool(poolAddress: string): LiquidityPool {
  const pool = LiquidityPool.load(poolAddress)!;
  return pool;
}
