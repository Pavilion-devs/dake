use anchor_lang::prelude::*;
use crate::state::{Market, MarketStatus};
use crate::error::DakeError;

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,
}

/// Close a market for betting (no more bets accepted)
pub fn handler(ctx: Context<CloseMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.authority == ctx.accounts.authority.key(),
        DakeError::Unauthorized
    );
    require!(market.is_open(), DakeError::MarketNotOpen);

    market.status = MarketStatus::Closed;

    msg!("Dake Market #{} closed for betting!", market.market_id);
    msg!("   Final pool - YES: {}, NO: {}", market.total_yes_amount, market.total_no_amount);
    msg!("   Total participants: {}", market.participant_count);

    Ok(())
}
