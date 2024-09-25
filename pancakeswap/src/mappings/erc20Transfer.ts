import { Transfer, ERC20 } from "../../generated/templates/ERC20/ERC20";
import { Address, BigInt, ethereum, log, json } from "@graphprotocol/graph-ts";
import { getOrCreateToken } from "../common/getters";
import {
  Token,
  TokenHolder,
  TokenBalance,
  DailyTokenHolderCount,
} from "../../generated/schema";
import {
  DEFAULT_DECIMALS,
  BIGDECIMAL_ZERO,
  BIGINT_ZERO,
} from "../common/constants";
//  交易事件
export function handleTransfer(event: Transfer): void {
  // 取token信息
  let token = getOrCreateToken(event, event.address.toHexString());

  let fromHolder = TokenHolder.load(
    event.address.toHexString().concat("-").concat(event.params.from.toHex())
  );
  if (!fromHolder) {
    fromHolder = new TokenHolder(
      event.address.toHexString().concat("-").concat(event.params.from.toHex())
    );
    fromHolder.address = event.params.from.toHex();

    // fromHolder.tokenBalances = [];
    fromHolder.save();
  }

  let toHolder = TokenHolder.load(
    event.address.toHexString().concat("-").concat(event.params.to.toHex())
  );
  if (!toHolder) {
    toHolder = new TokenHolder(
      event.address.toHexString().concat("-").concat(event.params.to.toHex())
    );
    toHolder.address = event.params.to.toHex();
    // toHolder.tokenBalances = [];
    toHolder.save();
  }
  // 更新余额
  updateTokenBalance(
    event.params.value,
    "from",
    fromHolder,
    token,
    event.block.timestamp
  );
  updateTokenBalance(
    event.params.value,
    "to",
    toHolder,
    token,
    event.block.timestamp
  );
}

function updateTokenBalance(
  value: BigInt,
  type: string,
  holder: TokenHolder,
  token: Token,
  timestamp: BigInt
): void {
  let balanceId = holder.id.concat("-").concat(token.id);
  let balance = TokenBalance.load(balanceId);

  if (!balance) {
    let tokenContract = ERC20.bind(Address.fromString(token.id));
    let balanceOf = tokenContract.balanceOf(Address.fromString(holder.address)); // 调用合约的 name() 方法
    // 第一次获取链上余额
    value = balanceOf;

    balance = new TokenBalance(balanceId);

    //  合约余额 ——》  用户余额
    balance.holder = holder.id;
    balance.token = token.id;
    // 查询erc20接口
    balance.balance = balanceOf;
    balance.save();

    // let holderTokenBalances = holder.tokenBalances;
    // holderTokenBalances.push(balance.id);
    // holder.tokenBalances = holderTokenBalances;

    // 用户余额 ——》 合约余额
    holder.tokenBalance = balance.id;
    holder.save();

    // 将持有者添加到代币的持有者列表
    // let tokenEntity = Token.load(token.id);
    // if (tokenEntity) {
    //   let holderss = tokenEntity.holders;
    //   holderss.push(holder.id);
    //   tokenEntity.holders = holderss;
    //   tokenEntity.save();
    // }
  } else {
    if (type == "from") {
      balance.balance = balance.balance.minus(value);
    } else {
      balance.balance = balance.balance.plus(value);
    }
    balance.save();
  }
  // 持币人数统计
  updateDailyHolderCount(holder, balance, timestamp, token);
}

// 持币人数统计
function updateDailyHolderCount(
  holder: TokenHolder,
  balance: TokenBalance,
  timestamp: BigInt,
  token: Token
): void {
  // 获取时间戳，格式为 "YYYY-MM-DD"
  let formattedDate = timestampToDate(timestamp.toString()); // 获取 "YYYY-MM-DD" 格式

  // 更新 TokenBalance 的每日余额
  let dailyBalanceId = token.id + "-" + formattedDate;
  let dailyTokenHolderCount = DailyTokenHolderCount.load(dailyBalanceId);

  // 如果没有记录，则创建新记录
  if (!dailyTokenHolderCount) {
    let previousDailyBalanceId =
      token.id +
      "-" +
      timestampToDate(timestamp.minus(new BigInt(86400)).toString());
    let previousDailyTokenHolderCount = DailyTokenHolderCount.load(
      previousDailyBalanceId
    );

    dailyTokenHolderCount = new DailyTokenHolderCount(dailyBalanceId);
    dailyTokenHolderCount.date = formattedDate;

    // 前一天的总人数
    if (previousDailyTokenHolderCount) {
      dailyTokenHolderCount.holderCount =
        previousDailyTokenHolderCount.holderCount;
    } else {
      dailyTokenHolderCount.holderCount = 0;
    }
    dailyTokenHolderCount.holderAddresses = ""; // 初始化持币人地址

    dailyTokenHolderCount.token = token.id;
  } else {
    // 使用分隔符（例如逗号）处理 holderAddresses
    let holderAddressesArray =
      dailyTokenHolderCount.holderAddresses.length > 0
        ? dailyTokenHolderCount.holderAddresses.split(",")
        : [];

    // 检查余额
    if (balance && balance.balance <= BigInt.fromI32(0)) {
      // 如果余额小于或等于0，从数组中删除 holder.address
      let addressIndex = holderAddressesArray.indexOf(holder.address);
      if (addressIndex !== -1) {
        holderAddressesArray.splice(addressIndex, 1); // 移除地址
        dailyTokenHolderCount.holderCount =
          dailyTokenHolderCount.holderCount - 1; // 更新持币人数
      }
    } else {
      // 如果余额大于0，添加 holder.address 到数组
      if (holderAddressesArray.indexOf(holder.address) === -1) {
        holderAddressesArray.push(holder.address); // 添加地址
        dailyTokenHolderCount.holderCount =
          dailyTokenHolderCount.holderCount + 1; // 更新持币人数
      }
    }

    // 将数组转换回字符串并存储回 holderAddresses
    dailyTokenHolderCount.holderAddresses = holderAddressesArray.join(",");
  }
  dailyTokenHolderCount.save();
}

// 返回 YYYY-MM-DD
function timestampToDate(timestamp: string): string {
  const date = new Date(i64(parseInt(timestamp) * 1000)); // 假设时间戳是以秒为单位，如果是毫秒则不乘以1000
  return date.toISOString().split("T")[0]; // 可以根据需要添加时间格式
}
