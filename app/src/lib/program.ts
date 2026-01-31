import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

// Program ID from the deployed contract
export const PROGRAM_ID = new PublicKey(
  "5apEYrFFuxT7yExEFz56kfmuYvc1YxcActFCMWnYpQea"
);

// Inco Lightning Program ID
export const INCO_LIGHTNING_PROGRAM_ID = new PublicKey(
  "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
);

// IDL import
import idl from "./idl.json";

export type DakeIDL = typeof idl;

export function getProgram(
  connection: Connection,
  wallet: AnchorProvider["wallet"]
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program(idl as any, provider);
}

// PDA derivation functions
export function getMarketPDA(marketId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

export function getPositionPDA(
  market: PublicKey,
  owner: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function getVaultPDA(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), market.toBuffer()],
    PROGRAM_ID
  );
}

// Derive allowance PDA for Inco Lightning
export function deriveAllowancePda(handle: bigint, owner: PublicKey): [PublicKey, number] {
  const buf = Buffer.alloc(16);
  let v = handle;
  for (let i = 0; i < 16; i++) {
    buf[i] = Number(v & BigInt(0xff));
    v >>= BigInt(8);
  }
  return PublicKey.findProgramAddressSync(
    [buf, owner.toBuffer()],
    INCO_LIGHTNING_PROGRAM_ID
  );
}

// Convert u128 handle to Buffer
export function handleToBuffer(handle: BN | bigint): Buffer {
  const bn = typeof handle === "bigint" ? new BN(handle.toString()) : handle;
  return bn.toArrayLike(Buffer, "le", 16);
}

// Market status enum
export enum MarketStatus {
  Open = 0,
  Closed = 1,
  ResolvedYes = 2,
  ResolvedNo = 3,
}

export function getMarketStatusString(status: { open?: {} } | { closed?: {} } | { resolvedYes?: {} } | { resolvedNo?: {} }): string {
  if ('open' in status) return 'Open';
  if ('closed' in status) return 'Closed';
  if ('resolvedYes' in status) return 'Resolved: YES';
  if ('resolvedNo' in status) return 'Resolved: NO';
  return 'Unknown';
}

export function isMarketOpen(status: { open?: {} } | { closed?: {} } | { resolvedYes?: {} } | { resolvedNo?: {} }): boolean {
  return 'open' in status;
}

export function isMarketResolved(status: { open?: {} } | { closed?: {} } | { resolvedYes?: {} } | { resolvedNo?: {} }): boolean {
  return 'resolvedYes' in status || 'resolvedNo' in status;
}

// Market account type
export interface MarketAccount {
  authority: PublicKey;
  marketId: BN;
  question: string;
  resolutionTime: BN;
  status: { open?: {} } | { closed?: {} } | { resolvedYes?: {} } | { resolvedNo?: {} };
  totalYesAmount: BN;
  totalNoAmount: BN;
  participantCount: number;
  bump: number;
}

// Position account type
export interface PositionAccount {
  market: PublicKey;
  owner: PublicKey;
  amount: BN;
  lockedPayout: BN; // Locked at bet time - guaranteed payout if winner
  encryptedSideHandle: BN;
  isWinnerHandle: BN;
  claimed: boolean;
  bump: number;
}

export { SystemProgram, BN };
