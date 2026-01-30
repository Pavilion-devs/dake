use anchor_lang::prelude::*;
use crate::state::{Market, MarketStatus};
use crate::error::DakeError;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,
}

/// Resolve a market with the outcome
///
/// Parameters:
/// - outcome: true = YES wins, false = NO wins
pub fn handler(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.authority == ctx.accounts.authority.key(),
        DakeError::Unauthorized
    );
    require!(
        !market.is_resolved(),
        DakeError::MarketAlreadyResolved
    );

    // Set the resolution status
    if outcome {
        market.status = MarketStatus::ResolvedYes;
    } else {
        market.status = MarketStatus::ResolvedNo;
    }

    let winning_side = if outcome { "YES" } else { "NO" };
    let winning_pool = if outcome { market.total_yes_amount } else { market.total_no_amount };
    let losing_pool = if outcome { market.total_no_amount } else { market.total_yes_amount };

    msg!("Dake Market #{} RESOLVED!", market.market_id);
    msg!("   Question: {}", market.question);
    msg!("   Outcome: {} wins!", winning_side);
    msg!("   Winning pool: {} lamports", winning_pool);
    msg!("   Losing pool (goes to winners): {} lamports", losing_pool);
    msg!("   Total payout pool: {} lamports", market.total_pool());

    Ok(())
}
