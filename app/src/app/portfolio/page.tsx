"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { decrypt } from "@inco/solana-sdk/attested-decrypt";
import {
  PROGRAM_ID,
  INCO_LIGHTNING_PROGRAM_ID,
  getVaultPDA,
  getMarketStatusString,
  isMarketResolved,
  PositionAccount,
  MarketAccount,
  deriveAllowancePda,
} from "@/lib/program";
import idl from "@/lib/idl.json";

interface PositionWithMarket {
  positionPubkey: PublicKey;
  position: PositionAccount;
  marketPubkey: PublicKey;
  market: MarketAccount;
}

// Track winner check results locally
interface WinnerCheckResult {
  checked: boolean;
  isWinner: boolean | null;
  side: "YES" | "NO" | null;
  // Cache the decrypt result so we don't need to call decrypt() again for claiming
  decryptResult?: {
    plaintexts: string[];
    handles: string[];
    ed25519Instructions: any[];
  };
}

export default function PortfolioPage() {
  const { publicKey, signTransaction, signAllTransactions, signMessage, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [positions, setPositions] = useState<PositionWithMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [winnerResults, setWinnerResults] = useState<Record<string, WinnerCheckResult>>({});

  const fetchPositions = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const provider = new AnchorProvider(
        connection,
        {
          publicKey: PublicKey.default,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      // Fetch all positions for this user
      const positionAccounts = await (program.account as any).position.all([
        {
          memcmp: {
            offset: 8 + 32, // After discriminator + market pubkey
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      // Fetch corresponding markets
      const positionsWithMarkets: PositionWithMarket[] = [];

      for (const posAccount of positionAccounts) {
        try {
          const marketAccount = await (program.account as any).market.fetch(
            posAccount.account.market
          );
          positionsWithMarkets.push({
            positionPubkey: posAccount.publicKey,
            position: posAccount.account,
            marketPubkey: posAccount.account.market,
            market: marketAccount,
          });
        } catch (e) {
          console.error("Error fetching market for position:", e);
        }
      }

      setPositions(positionsWithMarkets);
    } catch (err) {
      console.error("Error fetching positions:", err);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleCheckWinner = async (positionData: PositionWithMarket) => {
    if (!publicKey || !signTransaction || !signAllTransactions || !signMessage) {
      setClaimError("Please connect your wallet");
      return;
    }

    const posKey = positionData.positionPubkey.toBase58();
    setClaiming(posKey);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);

      const isWinnerHandle = positionData.position.isWinnerHandle;
      const alreadyChecked = isWinnerHandle && isWinnerHandle.toString() !== "0";

      if (!alreadyChecked) {
        // STEP 1: Simulate check_winner to get the resulting is_winner_handle
        console.log("Step 1: Simulating check_winner to extract handle...");

        const checkWinnerIx = await program.methods
          .checkWinner()
          .accounts({
            checker: publicKey,
            market: positionData.marketPubkey,
            position: positionData.positionPubkey,
            systemProgram: SystemProgram.programId,
            incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          })
          .instruction();

        const { blockhash } = await connection.getLatestBlockhash();
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [checkWinnerIx],
        }).compileToV0Message();

        const simVtx = new VersionedTransaction(messageV0);

        // Simulate to get post-execution account state
        const simulation = await connection.simulateTransaction(simVtx, {
          sigVerify: false,
          accounts: {
            encoding: "base64",
            addresses: [positionData.positionPubkey.toBase58()],
          },
        });

        if (simulation.value.err) {
          console.error("Simulation failed:", simulation.value.err, simulation.value.logs);
          setClaimError("Simulation failed: " + JSON.stringify(simulation.value.err));
          return;
        }

        // Extract is_winner_handle from simulated position account data
        // Position layout after 8-byte discriminator:
        //   market: 32, owner: 32, amount: 8, locked_payout: 8,
        //   encrypted_side_handle: 16, is_winner_handle: 16, ...
        // is_winner_handle offset = 8 + 32 + 32 + 8 + 8 + 16 = 104
        const accountData = Buffer.from(
          (simulation.value.accounts![0] as any).data[0],
          "base64"
        );
        const handleBytes = accountData.slice(104, 120);
        let simHandle = BigInt(0);
        for (let i = 15; i >= 0; i--) {
          simHandle = simHandle * BigInt(256) + BigInt(handleBytes[i]);
        }

        console.log("Simulated is_winner_handle:", simHandle.toString());

        // STEP 2: Derive allowance PDA from the simulated handle
        const [allowancePda] = deriveAllowancePda(simHandle, publicKey);
        console.log("Allowance PDA:", allowancePda.toBase58());

        // STEP 3: Send the REAL check_winner with remaining accounts for allow
        console.log("Step 3: Sending real check_winner with allow...");
        const tx = await program.methods
          .checkWinner()
          .accounts({
            checker: publicKey,
            market: positionData.marketPubkey,
            position: positionData.positionPubkey,
            systemProgram: SystemProgram.programId,
            incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          })
          .remainingAccounts([
            { pubkey: allowancePda, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: false, isWritable: false },
          ])
          .rpc();

        console.log("check_winner TX:", tx);

        // Refetch position
        await new Promise((r) => setTimeout(r, 2000));
        const updatedPosition = await (program.account as any).position.fetch(
          positionData.positionPubkey
        );
        positionData.position = updatedPosition;
      }

      // STEP 4: Decrypt the is_winner_handle using Inco SDK (with retry for propagation delay)
      const updatedHandle = positionData.position.isWinnerHandle;
      if (!updatedHandle || updatedHandle.toString() === "0") {
        setClaimError("Failed to get winner result. Please try again.");
        return;
      }

      // Inco SDK expects DECIMAL string handles
      const handleDecimal = BigInt(updatedHandle.toString()).toString();
      console.log("Step 4: Decrypting handle (decimal):", handleDecimal);

      // Retry with incremental backoff — Inco devnet has block propagation delays
      let decryptResult = null;
      const delays = [3000, 5000, 8000, 12000]; // 3s, 5s, 8s, 12s
      for (let attempt = 0; attempt < delays.length; attempt++) {
        try {
          console.log(`Decrypt attempt ${attempt + 1}/${delays.length}, waiting ${delays[attempt] / 1000}s for propagation...`);
          await new Promise((r) => setTimeout(r, delays[attempt]));

          decryptResult = await decrypt([handleDecimal], {
            address: publicKey,
            signMessage: signMessage,
          });
          break; // success
        } catch (decryptErr: any) {
          console.warn(`Decrypt attempt ${attempt + 1} failed:`, decryptErr.message);
          if (attempt === delays.length - 1) {
            throw new Error("Decryption failed after retries. Inco devnet may be slow — please try 'Check if Winner' again in a minute.");
          }
        }
      }

      if (!decryptResult) {
        setClaimError("Decryption failed. Please try again in a moment.");
        return;
      }

      console.log("Decrypt result:", decryptResult);

      const plaintext = decryptResult.plaintexts[0];
      const isWinner = plaintext !== "0" && plaintext !== "0x0" && plaintext !== "0x" + "0".repeat(32) && plaintext !== "";

      // Determine which side the user bet on based on market outcome
      const marketStatus = positionData.market.status;
      let userSide: "YES" | "NO" | null = null;
      if ("resolvedYes" in marketStatus) {
        userSide = isWinner ? "YES" : "NO";
      } else if ("resolvedNo" in marketStatus) {
        userSide = isWinner ? "NO" : "YES";
      }

      setWinnerResults((prev) => ({
        ...prev,
        [posKey]: {
          checked: true,
          isWinner,
          side: userSide,
          decryptResult: {
            plaintexts: decryptResult.plaintexts,
            handles: decryptResult.handles,
            ed25519Instructions: decryptResult.ed25519Instructions,
          },
        },
      }));

      if (isWinner) {
        setClaimSuccess(`You WON! You bet ${userSide}. Click "Claim Winnings" to collect your payout.`);
      } else {
        setClaimSuccess(`You bet ${userSide}. Unfortunately you didn't win this market. Your bet side stays private on-chain.`);
      }

      fetchPositions();
    } catch (err: any) {
      console.error("Error checking winner:", err);
      setClaimError(err.message || "Failed to check winner status");
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimWinnings = async (positionData: PositionWithMarket) => {
    if (!publicKey || !signTransaction || !signAllTransactions || !signMessage) {
      setClaimError("Please connect your wallet (signMessage required)");
      return;
    }

    const posKey = positionData.positionPubkey.toBase58();
    const cachedResult = winnerResults[posKey];

    // Must have checked winner first
    if (!cachedResult?.checked || !cachedResult.isWinner) {
      setClaimError("Please click 'Check if Winner' first to verify your position");
      return;
    }

    setClaiming(posKey);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = new Program(idl as any, provider);
      const [vaultPda] = getVaultPDA(positionData.marketPubkey);

      // Use cached decrypt result from check_winner, or retry with backoff
      let decryptResult = cachedResult.decryptResult;

      if (!decryptResult) {
        // No cached result — need to call decrypt with retry + backoff
        const isWinnerHandle = positionData.position.isWinnerHandle;
        const handleDecimal = BigInt(isWinnerHandle.toString()).toString();

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`Decrypt retry ${attempt + 1}, waiting ${attempt * 3}s...`);
              await new Promise((r) => setTimeout(r, attempt * 3000));
            }
            decryptResult = await decrypt([handleDecimal], {
              address: publicKey,
              signMessage: signMessage,
            });
            break;
          } catch (retryErr: any) {
            if (attempt === 2) throw retryErr;
            console.warn("Decrypt attempt failed, retrying...", retryErr.message);
          }
        }
      }

      if (!decryptResult) {
        setClaimError("Failed to get decryption proof. Please try 'Check if Winner' again.");
        return;
      }

      console.log("Using decrypt result for claim:", decryptResult);

      // Build transaction with Ed25519 instructions + claim_winnings
      const tx = new Transaction();

      // Add Ed25519 verification instructions (must come before claim_winnings)
      for (const ed25519Ix of decryptResult.ed25519Instructions) {
        tx.add(ed25519Ix);
      }

      // Encode handle and plaintext in the EXACT format the Inco SDK uses:
      //
      // Handle: BigInt → hex string → ASCII char codes (variable length)
      //   e.g. 12345 → "3039" → [51, 48, 51, 57]
      //
      // Plaintext: 16 bytes, u128 little-endian
      //   e.g. 1 → [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      //
      // is_validsignature recomputes SHA256(handle_bytes || plaintext_bytes)
      // and checks it matches the Ed25519 message. Bytes must match exactly.

      const handleDecStr = decryptResult.handles[0].toString();
      const handleHexStr = BigInt(handleDecStr).toString(16);
      const handleBytes = Buffer.from(handleHexStr.split("").map((c: string) => c.charCodeAt(0)));

      const plaintextVal = BigInt(decryptResult.plaintexts[0].toString());
      const plaintextBytes = Buffer.alloc(16);
      const maxU64 = BigInt("18446744073709551615");
      if (plaintextVal <= maxU64) {
        let v = plaintextVal;
        for (let i = 0; i < 8; i++) {
          plaintextBytes[i] = Number(v & BigInt(0xff));
          v >>= BigInt(8);
        }
      } else {
        const low = plaintextVal & maxU64;
        const high = plaintextVal >> BigInt(64);
        let lv = low;
        for (let i = 0; i < 8; i++) {
          plaintextBytes[i] = Number(lv & BigInt(0xff));
          lv >>= BigInt(8);
        }
        let hv = high;
        for (let i = 8; i < 16; i++) {
          plaintextBytes[i] = Number(hv & BigInt(0xff));
          hv >>= BigInt(8);
        }
      }

      console.log("Handle hex string:", handleHexStr);
      console.log("Handle bytes:", Array.from(handleBytes));
      console.log("Plaintext bytes:", Array.from(plaintextBytes));

      // Add claim_winnings instruction (Anchor 'bytes' type expects Buffer)
      const claimIx = await program.methods
        .claimWinnings(
          handleBytes,
          plaintextBytes
        )
        .accounts({
          winner: publicKey,
          market: positionData.marketPubkey,
          position: positionData.positionPubkey,
          vault: vaultPda,
          instructions: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        })
        .instruction();

      tx.add(claimIx);

      // Send transaction
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signedTx = await signTransaction(tx);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txSig, "confirmed");

      setClaimSuccess(`Winnings claimed! TX: ${txSig.slice(0, 8)}...`);
      fetchPositions();

      window.open(
        `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
        "_blank"
      );
    } catch (err: any) {
      console.error("Error claiming:", err);
      if (err.message?.includes("NotWinner")) {
        setClaimError("You didn't win this market");
      } else if (err.message?.includes("decryption") || err.message?.includes("covalidator")) {
        setClaimError("Failed to decrypt winner status. Please try again.");
      } else {
        setClaimError(err.message || "Failed to claim winnings");
      }
    } finally {
      setClaiming(null);
    }
  };

  if (!connected) {
    return (
      <main className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center py-20 animate-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FACC15]/10 flex items-center justify-center">
            <Icon icon="solar:wallet-outline" width={40} className="text-[#FACC15]" />
          </div>
          <h2 className="text-2xl text-white font-medium mb-2">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect your wallet to view your prediction market positions and claim winnings.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium hover:bg-[#FACC15]/90 transition-all"
          >
            <Icon icon="solar:wallet-outline" width={20} />
            Connect Wallet
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-3xl lg:text-4xl font-light text-white font-dm-sans tracking-tight">
          Your Portfolio
        </h1>
        <p className="text-slate-400 mt-2">
          View your positions and claim winnings from resolved markets
        </p>
      </div>

      {/* Error/Success Messages */}
      {claimError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-6 animate-in">
          <Icon icon="solar:danger-triangle-outline" width={18} className="text-red-400" />
          <span className="text-red-400 text-sm">{claimError}</span>
          <button
            onClick={() => setClaimError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <Icon icon="solar:close-circle-outline" width={18} />
          </button>
        </div>
      )}

      {claimSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-6 animate-in">
          <Icon icon="solar:check-circle-outline" width={18} className="text-green-400" />
          <span className="text-green-400 text-sm">{claimSuccess}</span>
          <button
            onClick={() => setClaimSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-300"
          >
            <Icon icon="solar:close-circle-outline" width={18} />
          </button>
        </div>
      )}

      {/* Positions List */}
      {loading ? (
        <div className="space-y-4 animate-in-delay-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 animate-pulse"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="h-5 bg-white/5 rounded w-20" />
                <div className="h-5 bg-white/5 rounded w-24" />
              </div>
              <div className="h-6 bg-white/5 rounded w-3/4 mb-4" />
              <div className="h-10 bg-white/5 rounded w-32" />
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-20 animate-in-delay-1">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <Icon icon="solar:chart-square-outline" width={40} className="text-slate-500" />
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No positions yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            You haven't placed any bets yet. Browse markets and make your first prediction!
          </p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FACC15] text-neutral-900 rounded-full font-medium hover:bg-[#FACC15]/90 transition-all"
          >
            <Icon icon="solar:chart-square-outline" width={20} />
            Browse Markets
          </Link>
        </div>
      ) : (
        <div className="space-y-4 animate-in-delay-1">
          {positions.map((pos) => {
            const resolved = isMarketResolved(pos.market.status);
            const posKey = pos.positionPubkey.toBase58();
            const isClaiming = claiming === posKey;
            const winnerResult = winnerResults[posKey];

            return (
              <div
                key={posKey}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.03] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs text-slate-500">
                    #{pos.market.marketId.toString().slice(-6)}
                  </span>
                  <div className="flex items-center gap-2">
                    {winnerResult?.checked && (
                      <span
                        className={`text-xs px-3 py-1 rounded-full border font-medium ${
                          winnerResult.isWinner
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {winnerResult.isWinner ? "WON" : "LOST"}
                        {winnerResult.side ? ` (You bet ${winnerResult.side})` : ""}
                      </span>
                    )}
                    <span
                      className={`text-xs px-3 py-1 rounded-full border ${
                        resolved
                          ? "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20"
                      }`}
                    >
                      {getMarketStatusString(pos.market.status)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/markets/${pos.marketPubkey.toBase58()}`}
                  className="block text-lg text-white font-medium mb-4 hover:text-[#FACC15] transition-colors"
                >
                  {pos.market.question}
                </Link>

                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-white/[0.02] rounded-lg">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Your Bet</p>
                    <p className="text-white font-medium">
                      {(pos.position.amount.toNumber() / 1e9).toFixed(2)} SOL
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Locked Payout (if win)</p>
                    <p className="text-green-400 font-medium">
                      {(() => {
                        try {
                          const payout = pos.position.lockedPayout;
                          if (!payout) return "—";
                          const payoutBN = payout.toString();
                          const payoutNum = parseFloat(payoutBN) / 1e9;
                          if (payoutNum > 1000 || payoutNum < 0 || isNaN(payoutNum)) {
                            return "—";
                          }
                          return `${payoutNum.toFixed(2)} SOL`;
                        } catch {
                          return "—";
                        }
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
                  {winnerResult?.side ? (
                    <div className="flex items-center gap-2 text-[#FACC15]">
                      <Icon icon="solar:eye-outline" width={16} />
                      <span>You bet {winnerResult.side}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Icon icon="solar:lock-keyhole-outline" width={16} />
                      <span>Side encrypted</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-green-400">
                    <Icon icon="solar:verified-check-outline" width={16} />
                    <span>Payout locked</span>
                  </div>
                  {pos.position.claimed && (
                    <div className="flex items-center gap-2 text-[#FACC15]">
                      <Icon icon="solar:check-circle-outline" width={16} />
                      <span>Claimed</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {resolved && !pos.position.claimed && (
                  <div className="flex gap-3">
                    {!winnerResult?.checked ? (
                      <button
                        onClick={() => handleCheckWinner(pos)}
                        disabled={isClaiming}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {isClaiming ? (
                          <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                        ) : (
                          <Icon icon="solar:eye-outline" width={16} />
                        )}
                        Check if Winner
                      </button>
                    ) : winnerResult.isWinner ? (
                      <button
                        onClick={() => handleClaimWinnings(pos)}
                        disabled={isClaiming}
                        className="flex items-center gap-2 px-4 py-2 bg-[#FACC15] text-neutral-900 rounded-lg text-sm font-medium hover:bg-[#FACC15]/90 transition-colors disabled:opacity-50"
                      >
                        {isClaiming ? (
                          <Icon icon="solar:refresh-circle-outline" width={16} className="animate-spin" />
                        ) : (
                          <Icon icon="solar:wallet-money-outline" width={16} />
                        )}
                        Claim Winnings
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Icon icon="solar:shield-cross-outline" width={16} />
                        <span>Not a winner — your bet side stays private on-chain</span>
                      </div>
                    )}
                  </div>
                )}

                {!resolved && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon icon="solar:clock-circle-outline" width={16} />
                    <span>
                      Resolves {new Date(pos.market.resolutionTime.toNumber() * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {pos.position.claimed && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Icon icon="solar:check-circle-outline" width={16} />
                    <span>Winnings claimed successfully</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-[#FACC15]/5 border border-[#FACC15]/10 rounded-xl animate-in-delay-2">
        <div className="flex items-start gap-3">
          <Icon icon="solar:lock-keyhole-outline" width={20} className="text-[#FACC15] mt-0.5" />
          <div className="text-sm text-slate-300">
            <p>
              <strong className="text-[#FACC15]">Privacy powered by Inco:</strong> Your bet side (YES/NO) is encrypted on-chain.
              Nobody can see your position. Even if you lose, your choice stays private forever.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
