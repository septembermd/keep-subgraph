import { BigInt, Address } from "@graphprotocol/graph-ts"
import { Contract, Approval, Transfer as TransferEvent } from "../generated/Contract/Contract"
import { Token, Holder, Transfer, Transaction } from "../generated/schema"

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function getTokenEntity(): Token {
  let token = Token.load("Token");

  if (token === null) {
    token = new Token("Token");
    token.name = "KEEP Token";
    token.symbol = "KEEP";
    token.decimals = 18;
    token.address = Address.fromString("0x85eee30c52b0b379b046fb0f85f4f3dc3009afec");
    token.totalSupply = BigInt.fromI32(1000000000).toBigDecimal();
    token.maxSupply = BigInt.fromI32(21000000);
    token.holdersCount = BigInt.fromI32(0);
  }

  return token as Token;
}

export function getHolder(id: String): Holder {
  let tokenHolder = Holder.load(id.toString());

  if (tokenHolder == null) {
    tokenHolder = new Holder(id.toString());
    tokenHolder.balanceRaw = BigInt.fromI32(0);
    tokenHolder.balance = BigInt.fromI32(9).toBigDecimal();
  }

  return tokenHolder as Holder;
}

export function getTransfer(id :string) : Transfer {
  let transfer = Transfer.load(id);

  if (transfer == null) {
    transfer = new Transfer(id);
    transfer.value = BigInt.fromI32(0).toBigDecimal();
    transfer.timestamp = BigInt.fromI32(0);
    transfer.blockNumber = BigInt.fromI32(0);
  }

  return transfer as Transfer;
}

export function getTransaction(id: string): Transaction {
  let transaction = Transaction.load(id);

  if(transaction == null){
    transaction = new Transaction(id);
    transaction.id = id;
    transaction.timestamp = BigInt.fromI32(0);
    transaction.blockNumber = BigInt.fromI32(0);
  }

  return transaction as Transaction;
}

export function handleApproval(event: Approval): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  // let entity = Token.load(event.transaction.from.toHex());

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  // if (entity == null) {
  //   entity = new Token(event.transaction.from.toHex());
  // }

  // Entity fields can be set based on event parameters
  // entity.owner = event.params.owner;
  // entity.spender = event.params.spender;
  //
  // entity.hash = event.transaction.hash;
  // entity.value = event.transaction.value;
  // entity.from = event.transaction.from;
  // entity.to = event.transaction.to;
  //
  // entity.block = event.block.number;
  // entity.timestamp = event.block.timestamp;

  // Entities can be written to the store with `.save()`
  // entity.save();

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.DECIMALS(...)
  // - contract.INITIAL_SUPPLY(...)
  // - contract.NAME(...)
  // - contract.SYMBOL(...)
  // - contract.allowance(...)
  // - contract.approve(...)
  // - contract.approveAndCall(...)
  // - contract.balanceOf(...)
  // - contract.decimals(...)
  // - contract.decreaseAllowance(...)
  // - contract.increaseAllowance(...)
  // - contract.name(...)
  // - contract.symbol(...)
  // - contract.totalSupply(...)
  // - contract.transfer(...)
  // - contract.transferFrom(...)
}

export function handleTransfer(event: TransferEvent): void {
  let id = event.transaction.from.toHex();
  let contract = Token.bind(event.address);
  let token = getTokenEntity();
  let transfer = getTransfer(id);
  let tx = getTransaction(id);
  let fromHolder = getHolder(event.params.from.toHexString());
  let toHolder = getHolder(event.params.to.toHexString());

  // Token Entity
  token.totalSupply = contract.totalSupply().divDecimal(BigInt.fromI32(10).pow(18).toBigDecimal());

  // Transfer Entity
  transfer.blockNumber = event.block.number;
  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value.divDecimal(BigInt.fromI32(10).pow(18).toBigDecimal());
  transfer.timestamp = event.block.timestamp;
  transfer.gasPrice = event.transaction.gasPrice;
  transfer.gasUsed = event.transaction.gasUsed;
  transfer.save();

  // Transaction Entity
  tx.blockNumber = event.block.number;
  tx.from = event.transaction.from;
  tx.to = event.transaction.to;
  tx.timestamp = event.block.timestamp;
  tx.save();

  // From holder balance
  let fromHolderPrevBalanceRaw = fromHolder.balanceRaw;
  fromHolder.balanceRaw = fromHolder.balanceRaw.minus(event.params.value);
  fromHolder.balance = fromHolder.balanceRaw.divDecimal(BigInt.fromI32(10).pow(18).toBigDecimal());
  fromHolder.token = token.id;

  // Count total holders
  if (fromHolder.balanceRaw == BigInt.fromI32(0) && fromHolderPrevBalanceRaw > BigInt.fromI32(0)) {
    token.holdersCount = token.holdersCount.minus(BigInt.fromI32(1));
  } else if ( fromHolder.balanceRaw > BigInt.fromI32(0) && fromHolderPrevBalanceRaw == BigInt.fromI32(0)) {
    token.holdersCount = token.holdersCount.plus(BigInt.fromI32(1));
  }

  fromHolder.save();


  // To holder balance
  let toHolderPrevBalanceRaw  = toHolder.balanceRaw;
  toHolder.balanceRaw = toHolder.balanceRaw.plus(event.params.value);
  toHolder.balance = toHolder.balanceRaw.divDecimal(BigInt.fromI32(10).pow(18).toBigDecimal());
  toHolder.token = token.id;

  // Count total holders
  if (toHolder.balanceRaw == BigInt.fromI32(0) && toHolderPrevBalanceRaw > BigInt.fromI32(0)) {
    token.holdersCount = token.holdersCount.minus(BigInt.fromI32(1));
  } else if ( toHolder.balanceRaw > BigInt.fromI32(0) && toHolderPrevBalanceRaw == BigInt.fromI32(0)) {
    token.holdersCount = token.holdersCount.plus(BigInt.fromI32(1));
  }

  toHolder.save();


  token.save();
}
