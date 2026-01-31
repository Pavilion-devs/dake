use anchor_lang::prelude::*;
use inco_lightning::{
    cpi::{self, accounts::Allow},
    program::IncoLightning,
    ID as INCO_LIGHTNING_ID,
};
use crate::state::Position;
use crate::error::DakeError;

#[derive(Accounts)]
pub struct GrantDecryptAccess<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        constraint = position.owner == owner.key() @ DakeError::NotOwner,
        constraint = position.is_winner_handle != 0 @ DakeError::NotChecked,
    )]
    pub position: Account<'info, Position>,

    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

/// Grant the position owner permission to decrypt the is_winner_handle.
///
/// This must be called AFTER check_winner so that is_winner_handle is set.
/// The frontend derives the allowance PDA from the known is_winner_handle value.
pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, GrantDecryptAccess<'info>>) -> Result<()> {
    let position = &ctx.accounts.position;

    require!(ctx.remaining_accounts.len() >= 2, DakeError::NotChecked);

    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_lightning_program.to_account_info(),
        Allow {
            allowance_account: ctx.remaining_accounts[0].clone(),
            signer: ctx.accounts.owner.to_account_info(),
            allowed_address: ctx.remaining_accounts[1].clone(),
            system_program: ctx.accounts.system_program.to_account_info(),
        },
    );

    cpi::allow(cpi_ctx, position.is_winner_handle, true, position.owner)?;

    msg!("Decrypt access granted for is_winner_handle: {}", position.is_winner_handle);

    Ok(())
}
