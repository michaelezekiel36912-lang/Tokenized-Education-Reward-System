// reward-token.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface MintRecord {
  amount: number;
  recipient: string;
  metadata: string;
  timestamp: number;
}

interface ContractState {
  balances: Map<string, number>;
  minters: Map<string, boolean>;
  mintRecords: Map<number, MintRecord>;
  allowances: Map<string, number>; // Key as `${owner}_${spender}`
  totalSupply: number;
  paused: boolean;
  admin: string;
  mintCounter: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

// Mock contract implementation
class RewardTokenMock {
  private state: ContractState = {
    balances: new Map(),
    minters: new Map(),
    mintRecords: new Map(),
    allowances: new Map(),
    totalSupply: 0,
    paused: false,
    admin: "deployer",
    mintCounter: 0,
    tokenName: "EducationToken",
    tokenSymbol: "EDU",
    tokenDecimals: 6,
  };

  private CONTRACT_OWNER = "deployer";
  private MAX_METADATA_LEN = 500;
  private ERR_NOT_AUTHORIZED = 100;
  private ERR_PAUSED = 101;
  private ERR_INVALID_AMOUNT = 102;
  private ERR_INVALID_RECIPIENT = 103;
  private ERR_INVALID_MINTER = 104;
  private ERR_ALREADY_REGISTERED = 105;
  private ERR_METADATA_TOO_LONG = 106;
  private ERR_ALLOWANCE_INSUFFICIENT = 111;

  constructor() {
    this.state.minters.set(this.CONTRACT_OWNER, true);
  }

  getName(): ClarityResponse<string> {
    return { ok: true, value: this.state.tokenName };
  }

  getSymbol(): ClarityResponse<string> {
    return { ok: true, value: this.state.tokenSymbol };
  }

  getDecimals(): ClarityResponse<number> {
    return { ok: true, value: this.state.tokenDecimals };
  }

  getTotalSupply(): ClarityResponse<number> {
    return { ok: true, value: this.state.totalSupply };
  }

  getBalance(account: string): ClarityResponse<number> {
    return { ok: true, value: this.state.balances.get(account) ?? 0 };
  }

  getMintRecord(tokenId: number): ClarityResponse<MintRecord | null> {
    return { ok: true, value: this.state.mintRecords.get(tokenId) ?? null };
  }

  isMinter(account: string): ClarityResponse<boolean> {
    return { ok: true, value: this.state.minters.get(account) ?? false };
  }

  isPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }

  getAllowance(owner: string, spender: string): ClarityResponse<number> {
    const key = `${owner}_${spender}`;
    return { ok: true, value: this.state.allowances.get(key) ?? 0 };
  }

  getAdmin(): ClarityResponse<string> {
    return { ok: true, value: this.state.admin };
  }

  getMintCounter(): ClarityResponse<number> {
    return { ok: true, value: this.state.mintCounter };
  }

  setAdmin(caller: string, newAdmin: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    }
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  addMinter(caller: string, minter: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    }
    if (this.state.minters.get(minter)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    this.state.minters.set(minter, true);
    return { ok: true, value: true };
  }

  removeMinter(caller: string, minter: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    }
    this.state.minters.set(minter, false);
    return { ok: true, value: true };
  }

  mint(caller: string, amount: number, recipient: string, metadata: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (!this.state.minters.get(caller)) {
      return { ok: false, value: this.ERR_INVALID_MINTER };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === this.CONTRACT_OWNER) {
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    if (metadata.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_METADATA_TOO_LONG };
    }
    const currentBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, currentBalance + amount);
    this.state.totalSupply += amount;
    const tokenId = this.state.mintCounter + 1;
    this.state.mintRecords.set(tokenId, {
      amount,
      recipient,
      metadata,
      timestamp: Date.now(),
    });
    this.state.mintCounter = tokenId;
    return { ok: true, value: true };
  }

  transfer(caller: string, amount: number, sender: string, recipient: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (caller !== sender) {
      return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === this.CONTRACT_OWNER) {
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    const senderBalance = this.state.balances.get(sender) ?? 0;
    if (senderBalance < amount) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    this.state.balances.set(sender, senderBalance - amount);
    const recipientBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, recipientBalance + amount);
    return { ok: true, value: true };
  }

  transferFrom(caller: string, amount: number, owner: string, recipient: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const key = `${owner}_${caller}`;
    const currentAllowance = this.state.allowances.get(key) ?? 0;
    if (currentAllowance < amount) {
      return { ok: false, value: this.ERR_ALLOWANCE_INSUFFICIENT };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === this.CONTRACT_OWNER) {
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    const ownerBalance = this.state.balances.get(owner) ?? 0;
    if (ownerBalance < amount) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    this.state.allowances.set(key, currentAllowance - amount);
    this.state.balances.set(owner, ownerBalance - amount);
    const recipientBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, recipientBalance + amount);
    return { ok: true, value: true };
  }

  approve(caller: string, spender: string, amount: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const key = `${caller}_${spender}`;
    this.state.allowances.set(key, amount);
    return { ok: true, value: true };
  }

  burn(caller: string, amount: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const senderBalance = this.state.balances.get(caller) ?? 0;
    if (senderBalance < amount) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    this.state.balances.set(caller, senderBalance - amount);
    this.state.totalSupply -= amount;
    return { ok: true, value: true };
  }

  increaseAllowance(caller: string, spender: string, addedAmount: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const key = `${caller}_${spender}`;
    const currentAllowance = this.state.allowances.get(key) ?? 0;
    this.state.allowances.set(key, currentAllowance + addedAmount);
    return { ok: true, value: true };
  }

  decreaseAllowance(caller: string, spender: string, subtractedAmount: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const key = `${caller}_${spender}`;
    const currentAllowance = this.state.allowances.get(key) ?? 0;
    if (currentAllowance < subtractedAmount) {
      return { ok: false, value: this.ERR_ALLOWANCE_INSUFFICIENT };
    }
    this.state.allowances.set(key, currentAllowance - subtractedAmount);
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  minter: "wallet_1",
  user1: "wallet_2",
  user2: "wallet_3",
  spender: "wallet_4",
};

describe("RewardToken Contract", () => {
  let contract: RewardTokenMock;

  beforeEach(() => {
    contract = new RewardTokenMock();
    vi.resetAllMocks();
  });

  it("should initialize with correct token metadata", () => {
    expect(contract.getName()).toEqual({ ok: true, value: "EducationToken" });
    expect(contract.getSymbol()).toEqual({ ok: true, value: "EDU" });
    expect(contract.getDecimals()).toEqual({ ok: true, value: 6 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 0 });
  });

  it("should allow admin to add minter", () => {
    const addMinter = contract.addMinter(accounts.deployer, accounts.minter);
    expect(addMinter).toEqual({ ok: true, value: true });

    const isMinter = contract.isMinter(accounts.minter);
    expect(isMinter).toEqual({ ok: true, value: true });
  });

  it("should prevent non-admin from adding minter", () => {
    const addMinter = contract.addMinter(accounts.user1, accounts.user2);
    expect(addMinter).toEqual({ ok: false, value: 100 });
  });

  it("should allow minter to mint tokens with metadata", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const mintResult = contract.mint(
      accounts.minter,
      1000000, // 1000.000 EDU with 6 decimals
      accounts.user1,
      "Reward for completing module 1"
    );
    expect(mintResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 1000000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 1000000 });

    const mintRecord = contract.getMintRecord(1);
    expect(mintRecord).toEqual({
      ok: true,
      value: expect.objectContaining({
        amount: 1000000,
        recipient: accounts.user1,
        metadata: "Reward for completing module 1",
      }),
    });
  });

  it("should prevent non-minter from minting", () => {
    const mintResult = contract.mint(
      accounts.user1,
      1000000,
      accounts.user1,
      "Unauthorized mint"
    );
    expect(mintResult).toEqual({ ok: false, value: 104 });
  });

  it("should allow token transfer between users", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    const transferResult = contract.transfer(
      accounts.user1,
      500000,
      accounts.user1,
      accounts.user2
    );
    expect(transferResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 500000 });
    expect(contract.getBalance(accounts.user2)).toEqual({ ok: true, value: 500000 });
  });

  it("should prevent transfer of insufficient balance", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 100000, accounts.user1, "Test mint");

    const transferResult = contract.transfer(
      accounts.user1,
      200000,
      accounts.user1,
      accounts.user2
    );
    expect(transferResult).toEqual({ ok: false, value: 102 });
  });

  it("should allow approve and transfer-from", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    const approveResult = contract.approve(accounts.user1, accounts.spender, 300000);
    expect(approveResult).toEqual({ ok: true, value: true });
    expect(contract.getAllowance(accounts.user1, accounts.spender)).toEqual({ ok: true, value: 300000 });

    const transferFromResult = contract.transferFrom(accounts.spender, 200000, accounts.user1, accounts.user2);
    expect(transferFromResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 800000 });
    expect(contract.getBalance(accounts.user2)).toEqual({ ok: true, value: 200000 });
    expect(contract.getAllowance(accounts.user1, accounts.spender)).toEqual({ ok: true, value: 100000 });
  });

  it("should allow burning tokens", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    const burnResult = contract.burn(accounts.user1, 300000);
    expect(burnResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 700000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 700000 });
  });

  it("should pause and unpause contract", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: true });

    const mintDuringPause = contract.mint(
      accounts.deployer,
      1000000,
      accounts.user1,
      "Paused mint"
    );
    expect(mintDuringPause).toEqual({ ok: false, value: 101 });

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: false });
  });

  it("should prevent metadata exceeding max length", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const longMetadata = "a".repeat(501);
    const mintResult = contract.mint(
      accounts.minter,
      1000000,
      accounts.user1,
      longMetadata
    );
    expect(mintResult).toEqual({ ok: false, value: 106 });
  });

  it("should allow increasing and decreasing allowance", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    contract.approve(accounts.user1, accounts.spender, 100000);
    const increaseResult = contract.increaseAllowance(accounts.user1, accounts.spender, 200000);
    expect(increaseResult).toEqual({ ok: true, value: true });
    expect(contract.getAllowance(accounts.user1, accounts.spender)).toEqual({ ok: true, value: 300000 });

    const decreaseResult = contract.decreaseAllowance(accounts.user1, accounts.spender, 100000);
    expect(decreaseResult).toEqual({ ok: true, value: true });
    expect(contract.getAllowance(accounts.user1, accounts.spender)).toEqual({ ok: true, value: 200000 });
  });
});