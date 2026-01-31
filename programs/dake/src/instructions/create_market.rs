use anchor_lang::prelude::*;
use crate::state::{Market, MarketStatus};
use crate::error::DakeError;

/// Default initial liquidity per side (0.5 SOL = 500_000_000 lamports)
pub const DEFAULT_INITIAL_LIQUIDITY: u64 = 500_000_000;

#[derive(Accounts)]
#[instruction(market_id: u64, question: String)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Market::SIZE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Vault PDA to hold bet funds
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/// Create a new prediction market with initial liquidity
///
/// The market creator provides initial liquidity for both sides.
/// This ensures there's always profit potential for bettors.
/// Initial liquidity is set at 0.5 SOL per side (1 SOL total).
pub fn handler(
    ctx: Context<CreateMarket>,
    market_id: u64,
    question: String,
    resolution_time: i64,
) -> Result<()> {
    require!(question.len() <= 256, DakeError::QuestionTooLong);

    let initial_liquidity = DEFAULT_INITIAL_LIQUIDITY;
    let total_liquidity = initial_liquidity.checked_mul(2).unwrap();

    // Transfer initial liquidity from creator to vault (funds both YES and NO pools)
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.authority.key(),
            &ctx.accounts.vault.key(),
            total_liquidity,
        ),
        &[
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.market_id = market_id;
    market.question = question.clone();
    market.resolution_time = resolution_time;
    market.status = MarketStatus::Open;
    // Initialize both pools with liquidity - ensures profitable odds from start
    market.total_yes_amount = initial_liquidity;
    market.total_no_amount = initial_liquidity;
    market.participant_count = 0;
    market.bump = ctx.bumps.market;

    msg!("Dake Market #{} created with initial liquidity!", market_id);
    msg!("   Question: {}", question);
    msg!("   Resolution time: {}", resolution_time);
    msg!("   Initial liquidity: {} lamports per side", initial_liquidity);
    msg!("   Starting odds: 2.00x (50/50)");

    Ok(())
}
