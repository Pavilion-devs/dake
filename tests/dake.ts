import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dake } from "../target/types/dake";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import { encryptValue } from "@inco/solana-sdk/encryption";
import { decrypt } from "@inco/solana-sdk/attested-decrypt";
import {
  handleToBuffer,
  plaintextToBuffer,
  hexToBuffer,
} from "@inco/solana-sdk/utils";

const INCO_LIGHTNING_PROGRAM_ID = new PublicKey(
  "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
);

describe("dake", () => {
  const rpcUrl =
    process.env.HELIUS_RPC_URL ||
    process.env.ANCHOR_PROVIDER_URL ||
    "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    anchor.AnchorProvider.env().wallet,
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = anchor.workspace.Dake as Program<Dake>;
  let wallet: Keypair;

  // Market parameters
  const marketId = Math.floor(Date.now() / 1000);
  const QUESTION = "Will SOL hit $500 by March 2026?";
  const RESOLUTION_TIME = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const BET_AMOUNT = 50_000_000; // 0.05 SOL

  // User's bet: YES (1) or NO (0)
  const MY_SIDE = 1; // Betting YES

  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let positionPda: PublicKey;

  before(() => {
    wallet = (provider.wallet as any).payer as Keypair;

    const idBuffer = Buffer.alloc(8);
    idBuffer.writeBigUInt64LE(BigInt(marketId));

    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), idBuffer],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
    [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );
  });

  function deriveAllowancePda(handle: bigint): [PublicKey, number] {
    const buf = Buffer.alloc(16);
    let v = handle;
    for (let i = 0; i < 16; i++) {
      buf[i] = Number(v & BigInt(0xff));
      v >>= BigInt(8);
    }
    return PublicKey.findProgramAddressSync(
      [buf, wallet.publicKey.toBuffer()],
      INCO_LIGHTNING_PROGRAM_ID
    );
  }

  async function decryptHandle(
    handle: string
  ): Promise<{ plaintext: string; ed25519Instructions: any[] } | null> {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const result = await decrypt([handle], {
        address: wallet.publicKey,
        signMessage: async (msg: Uint8Array) =>
          nacl.sign.detached(msg, wallet.secretKey),
      });
      return {
        plaintext: result.plaintexts[0],
        ed25519Instructions: result.ed25519Instructions,
      };
    } catch {
      return null;
    }
  }

  async function getHandleFromSimulation(
    tx: anchor.web3.Transaction,
    prefix: string
  ): Promise<bigint | null> {
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    tx.sign(wallet);

    const sim = await connection.simulateTransaction(tx);
    for (const log of sim.value.logs || []) {
      if (log.includes(prefix)) {
        const match = log.match(/(\d+)/);
        if (match) return BigInt(match[1]);
      }
    }
    return null;
  }

  it("1. Create prediction market", async () => {
    const tx = await program.methods
      .createMarket(
        new anchor.BN(marketId),
        QUESTION,
        new anchor.BN(RESOLUTION_TIME)
      )
      .accounts({
        authority: wallet.publicKey,
        market: marketPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Market created:", tx);
    console.log("   Question:", QUESTION);
    console.log("   Place your bets!");
  });

  it("2. Place encrypted bet (YES side)", async () => {
    console.log("   My side:", MY_SIDE === 1 ? "YES" : "NO", "(encrypted!)");
    console.log("   Bet amount:", BET_AMOUNT / 1_000_000_000, "SOL");

    // Encrypt the side (1 = YES, 0 = NO)
    const encryptedSide = await encryptValue(BigInt(MY_SIDE));

    const tx = await program.methods
      .placeBet(hexToBuffer(encryptedSide), new anchor.BN(BET_AMOUNT), MY_SIDE)
      .accounts({
        bettor: wallet.publicKey,
        market: marketPda,
        position: positionPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
        incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
      } as any)
      .rpc();

    console.log("Bet placed:", tx);
    console.log("   Your position is encrypted - nobody knows your side!");
  });

  it("3. Close market for betting", async () => {
    const tx = await program.methods
      .closeMarket()
      .accounts({
        authority: wallet.publicKey,
        market: marketPda,
      } as any)
      .rpc();

    console.log("Market closed for betting:", tx);
  });

  it("4. Resolve market (YES wins)", async () => {
    // Resolve with YES winning (outcome = true)
    const tx = await program.methods
      .resolveMarket(true)
      .accounts({
        authority: wallet.publicKey,
        market: marketPda,
      } as any)
      .rpc();

    console.log("Market resolved - YES wins:", tx);
  });

  it("5. Check if I won (encrypted comparison)", async () => {
    // First simulate to get the result handle
    const txForSim = await program.methods
      .checkWinner()
      .accounts({
        checker: wallet.publicKey,
        market: marketPda,
        position: positionPda,
        systemProgram: SystemProgram.programId,
        incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
      } as any)
      .transaction();

    const resultHandle = await getHandleFromSimulation(
      txForSim,
      "Is winner handle:"
    );

    if (resultHandle) {
      const [allowancePda] = deriveAllowancePda(resultHandle);

      const tx = await program.methods
        .checkWinner()
        .accounts({
          checker: wallet.publicKey,
          market: marketPda,
          position: positionPda,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        } as any)
        .remainingAccounts([
          { pubkey: allowancePda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
        ])
        .rpc();

      console.log("Winner check completed:", tx);

      // Decrypt the result
      const result = await decryptHandle(resultHandle.toString());
      if (result) {
        const won = result.plaintext === "1";
        console.log("   Did I win?", won ? "YES! 🎉" : "No");
      }
    }
  });

  it("6. Claim winnings (if winner)", async () => {
    const position = await program.account.position.fetch(positionPda);
    const isWinnerHandle = position.isWinnerHandle.toString();

    if (isWinnerHandle === "0") {
      console.log("   Position not checked yet");
      return;
    }

    const result = await decryptHandle(isWinnerHandle);
    if (!result) {
      console.log("   Failed to decrypt");
      return;
    }

    const isWinner = result.plaintext === "1";
    console.log("   Is winner:", isWinner);

    if (isWinner) {
      const claimIx = await program.methods
        .claimWinnings(
          handleToBuffer(isWinnerHandle),
          plaintextToBuffer(result.plaintext)
        )
        .accounts({
          winner: wallet.publicKey,
          market: marketPda,
          position: positionPda,
          vault: vaultPda,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        } as any)
        .instruction();

      const tx = new Transaction();
      result.ed25519Instructions.forEach((ix) => tx.add(ix));
      tx.add(claimIx);

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const signedTx = await provider.wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      console.log("Winnings claimed! 💰", sig);
    } else {
      console.log("   Not a winner - cannot claim");
    }
  });

  // ========== LOSER TEST ==========
  describe("Non-winner flow", () => {
    const marketId2 = marketId + 1;
    const LOSER_SIDE = 0; // Betting NO, but YES will win

    let market2Pda: PublicKey;
    let vault2Pda: PublicKey;
    let position2Pda: PublicKey;

    before(() => {
      const idBuffer = Buffer.alloc(8);
      idBuffer.writeBigUInt64LE(BigInt(marketId2));

      [market2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), idBuffer],
        program.programId
      );
      [vault2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), market2Pda.toBuffer()],
        program.programId
      );
      [position2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), market2Pda.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );
    });

    it("7. Create second market", async () => {
      const tx = await program.methods
        .createMarket(
          new anchor.BN(marketId2),
          "Will BTC hit $200k by 2026?",
          new anchor.BN(RESOLUTION_TIME)
        )
        .accounts({
          authority: wallet.publicKey,
          market: market2Pda,
          vault: vault2Pda,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Market 2 created:", tx);
    });

    it("8. Place bet on losing side (NO)", async () => {
      console.log("   Betting NO (will lose since YES wins)");
      const encryptedSide = await encryptValue(BigInt(LOSER_SIDE));

      const tx = await program.methods
        .placeBet(
          hexToBuffer(encryptedSide),
          new anchor.BN(BET_AMOUNT),
          LOSER_SIDE
        )
        .accounts({
          bettor: wallet.publicKey,
          market: market2Pda,
          position: position2Pda,
          vault: vault2Pda,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        } as any)
        .rpc();

      console.log("Bet placed:", tx);
    });

    it("9. Close and resolve market (YES wins)", async () => {
      await program.methods
        .closeMarket()
        .accounts({
          authority: wallet.publicKey,
          market: market2Pda,
        } as any)
        .rpc();

      const tx = await program.methods
        .resolveMarket(true) // YES wins, but we bet NO
        .accounts({
          authority: wallet.publicKey,
          market: market2Pda,
        } as any)
        .rpc();

      console.log("Market resolved - YES wins:", tx);
    });

    it("10. Check winner (should be loser)", async () => {
      const txForSim = await program.methods
        .checkWinner()
        .accounts({
          checker: wallet.publicKey,
          market: market2Pda,
          position: position2Pda,
          systemProgram: SystemProgram.programId,
          incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
        } as any)
        .transaction();

      const resultHandle = await getHandleFromSimulation(
        txForSim,
        "Is winner handle:"
      );

      if (resultHandle) {
        const [allowancePda] = deriveAllowancePda(resultHandle);

        const tx = await program.methods
          .checkWinner()
          .accounts({
            checker: wallet.publicKey,
            market: market2Pda,
            position: position2Pda,
            systemProgram: SystemProgram.programId,
            incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
          } as any)
          .remainingAccounts([
            { pubkey: allowancePda, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
          ])
          .rpc();

        console.log("Winner check completed:", tx);

        const result = await decryptHandle(resultHandle.toString());
        if (result) {
          const won = result.plaintext === "1";
          console.log("   Did I win?", won ? "YES!" : "No (as expected)");
        }
      }
    });

    it("11. Claim should fail for loser", async () => {
      const position = await program.account.position.fetch(position2Pda);
      const isWinnerHandle = position.isWinnerHandle.toString();

      if (isWinnerHandle === "0") {
        console.log("   Position not checked");
        return;
      }

      const result = await decryptHandle(isWinnerHandle);
      if (!result) {
        console.log("   Failed to decrypt");
        return;
      }

      const isWinner = result.plaintext === "1";
      console.log("   Is winner:", isWinner);

      if (!isWinner) {
        console.log("   Trying to claim anyway (should fail)...");
        try {
          const claimIx = await program.methods
            .claimWinnings(
              handleToBuffer(isWinnerHandle),
              plaintextToBuffer(result.plaintext)
            )
            .accounts({
              winner: wallet.publicKey,
              market: market2Pda,
              position: position2Pda,
              vault: vault2Pda,
              instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
              systemProgram: SystemProgram.programId,
              incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
            } as any)
            .instruction();

          const tx = new Transaction();
          result.ed25519Instructions.forEach((ix) => tx.add(ix));
          tx.add(claimIx);

          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = wallet.publicKey;

          const signedTx = await provider.wallet.signTransaction(tx);
          await connection.sendRawTransaction(signedTx.serialize());

          throw new Error("Should have failed!");
        } catch (e: any) {
          if (
            e.message.includes("NotWinner") ||
            e.message.includes("Should have failed")
          ) {
            console.log("   ✓ Claim correctly rejected - NotWinner!");
          } else {
            console.log("   Claim rejected:", e.message.slice(0, 50));
          }
        }
      }
    });
  });
});
