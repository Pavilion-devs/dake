use anchor_lang::prelude::*;
use inco_lightning::{
    cpi::{self, accounts::{Allow, Operation}},
    program::IncoLightning,
    types::{Ebool, Euint128},
    ID as INCO_LIGHTNING_ID,
};
use crate::state::{Market, MarketStatus, Position};
use crate::error::DakeError;

#[derive(Accounts)]
pub struct CheckWinner<'info> {
    #[account(mut)]
    pub checker: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(mut)]
    pub position: Account<'info, Position>,

    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

/// Check if a position is a winner (encrypted comparison)
///
/// This compares the user's encrypted side with the winning side:
/// - If market resolved YES (1), check if encrypted_side == 1
/// - If market resolved NO (0), check if encrypted_side == 0
pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, CheckWinner<'info>>) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    require!(market.is_resolved(), DakeError::MarketNotResolved);

    let inco = ctx.accounts.inco_lightning_program.to_account_info();

    // Determine winning side value: 1 for YES, 0 for NO
    let winning_side_value: u128 = match market.status {
        MarketStatus::ResolvedYes => 1,
        MarketStatus::ResolvedNo => 0,
        _ => return Err(DakeError::MarketNotResolved.into()),
    };

    // Create encrypted winning side value
    let cpi_ctx = CpiContext::new(
        inco.clone(),
        Operation {
            signer: ctx.accounts.checker.to_account_info(),
        },
    );
    let winning_side_encrypted: Euint128 = cpi::as_euint128(cpi_ctx, winning_side_value)?;

    // Compare: user_side == winning_side
    let cpi_ctx = CpiContext::new(
        inco.clone(),
        Operation {
            signer: ctx.accounts.checker.to_account_info(),
        },
    );
    let is_winner: Ebool = cpi::e_eq(
        cpi_ctx,
        Euint128(position.encrypted_side_handle),
        winning_side_encrypted,
        0,
    )?;

    position.is_winner_handle = is_winner.0;

    // Allow position owner to decrypt the result
    if ctx.remaining_accounts.len() >= 2 {
        let cpi_ctx = CpiContext::new(
            inco,
            Allow {
                allowance_account: ctx.remaining_accounts[0].clone(),
                signer: ctx.accounts.checker.to_account_info(),
                allowed_address: ctx.remaining_accounts[1].clone(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );
        cpi::allow(cpi_ctx, is_winner.0, true, position.owner)?;
    }

    msg!("Position checked for Dake Market #{}!", market.market_id);
    msg!("   Owner: {}", position.owner);
    msg!("   Is winner handle: {} (decrypt to see result)", is_winner.0);

    Ok(())
}
