use anchor_lang::prelude::*;
use crate::state::{Market, MarketStatus};
use crate::error::DakeError;

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

/// Create a new prediction market
pub fn handler(
    ctx: Context<CreateMarket>,
    market_id: u64,
    question: String,
    resolution_time: i64,
) -> Result<()> {
    require!(question.len() <= 256, DakeError::QuestionTooLong);

    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.market_id = market_id;
    market.question = question.clone();
    market.resolution_time = resolution_time;
    market.status = MarketStatus::Open;
    market.total_yes_amount = 0;
    market.total_no_amount = 0;
    market.participant_count = 0;
    market.bump = ctx.bumps.market;

    msg!("Dake Market #{} created!", market_id);
    msg!("   Question: {}", question);
    msg!("   Resolution time: {}", resolution_time);
    msg!("   Status: Open for betting");

    Ok(())
}
