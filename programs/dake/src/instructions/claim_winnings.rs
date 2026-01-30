use anchor_lang::prelude::*;
use inco_lightning::{
    cpi::{self, accounts::VerifySignature},
    program::IncoLightning,
    ID as INCO_LIGHTNING_ID,
};
use crate::state::{Market, MarketStatus, Position};
use crate::error::DakeError;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub position: Account<'info, Position>,

    /// CHECK: Vault PDA holding the funds
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,

    /// CHECK: Instructions sysvar for Ed25519 signature verification
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

/// Claim winnings by proving winner status
///
/// Payout calculation (proportional):
/// - Winner receives: (their_bet / total_winning_bets) * total_pool
/// - Example: If you bet 100 on YES, total YES bets = 1000, total pool = 2000
///   Your payout = (100/1000) * 2000 = 200 (2x return)
pub fn handler(
    ctx: Context<ClaimWinnings>,
    handle: Vec<u8>,
    plaintext: Vec<u8>,
) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    require!(position.owner == ctx.accounts.winner.key(), DakeError::NotOwner);
    require!(position.is_winner_handle != 0, DakeError::NotChecked);
    require!(!position.claimed, DakeError::AlreadyClaimed);
    require!(market.is_resolved(), DakeError::MarketNotResolved);

    // Verify the decryption signature on-chain
    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_lightning_program.to_account_info(),
        VerifySignature {
            instructions: ctx.accounts.instructions.to_account_info(),
            signer: ctx.accounts.winner.to_account_info(),
        },
    );

    cpi::is_validsignature(
        cpi_ctx,
        1,
        Some(vec![handle]),
        Some(vec![plaintext.clone()]),
    )?;

    // Parse the verified plaintext - should be non-zero (true) for winner
    let is_winner = parse_plaintext_to_bool(&plaintext)?;
    require!(is_winner, DakeError::NotWinner);

    // Calculate proportional payout
    let (winning_pool, _losing_pool) = match market.status {
        MarketStatus::ResolvedYes => (market.total_yes_amount, market.total_no_amount),
        MarketStatus::ResolvedNo => (market.total_no_amount, market.total_yes_amount),
        _ => return Err(DakeError::MarketNotResolved.into()),
    };

    // Payout = (user_bet / winning_pool) * total_pool
    // To avoid floating point: payout = (user_bet * total_pool) / winning_pool
    let total_pool = market.total_pool();
    let user_bet = position.amount;

    let payout = if winning_pool > 0 {
        (user_bet as u128)
            .checked_mul(total_pool as u128)
            .and_then(|v| v.checked_div(winning_pool as u128))
            .map(|v| v as u64)
            .unwrap_or(0)
    } else {
        // Edge case: no winning bets, shouldn't happen but return original bet
        user_bet
    };

    // Ensure we don't pay out more than vault has
    let vault_balance = ctx.accounts.vault.lamports();
    let actual_payout = payout.min(vault_balance);

    require!(actual_payout > 0, DakeError::NoFunds);

    // Mark as claimed
    position.claimed = true;

    // Transfer payout from vault to winner
    let market_key = market.key();
    let vault_seeds: &[&[u8]] = &[
        b"vault",
        market_key.as_ref(),
        &[ctx.bumps.vault],
    ];

    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.vault.key(),
            &ctx.accounts.winner.key(),
            actual_payout,
        ),
        &[
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.winner.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[vault_seeds],
    )?;

    let profit = actual_payout.saturating_sub(user_bet);
    let multiplier = if user_bet > 0 {
        (actual_payout as f64 / user_bet as f64 * 100.0) as u64
    } else {
        100
    };

    msg!("Winnings claimed from Dake Market #{}!", market.market_id);
    msg!("   Original bet: {} lamports", user_bet);
    msg!("   Payout: {} lamports", actual_payout);
    msg!("   Profit: {} lamports ({}% return)", profit, multiplier);

    Ok(())
}

/// Parse decrypted boolean plaintext
fn parse_plaintext_to_bool(plaintext: &[u8]) -> Result<bool> {
    if plaintext.is_empty() {
        return Ok(false);
    }

    // Check if any byte is non-zero (handles u128 LE format where 1 = [1,0,0,0,...])
    let any_nonzero = plaintext.iter().any(|&b| b != 0 && b != b'0');

    // Also check for string "0"/"1" format
    if let Ok(s) = std::str::from_utf8(plaintext) {
        if s == "0" || s == "false" {
            return Ok(false);
        }
        if s == "1" || s == "true" {
            return Ok(true);
        }
    }

    Ok(any_nonzero)
}
