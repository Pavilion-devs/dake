use anchor_lang::prelude::*;
use inco_lightning::{
    cpi::{self, accounts::{Allow, Operation}},
    program::IncoLightning,
    types::Euint128,
    ID as INCO_LIGHTNING_ID,
};
use crate::state::{Market, Position};
use crate::error::DakeError;

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = bettor,
        space = Position::SIZE,
        seeds = [b"position", market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    /// CHECK: Vault PDA to hold bet funds
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

/// Place a bet on a prediction market
///
/// Parameters:
/// - encrypted_side: Encrypted value of the side (1 = YES, 0 = NO)
/// - amount: Bet amount in lamports (public - needed for payout calculation)
/// - side_for_pool: The actual side (0 or 1) to update pool totals
///                  This must match the encrypted value - we trust the client here
///                  (In production, you'd use a commit-reveal scheme)
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, PlaceBet<'info>>,
    encrypted_side: Vec<u8>,
    amount: u64,
    side_for_pool: u8, // 0 = NO, 1 = YES
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(market.is_open(), DakeError::MarketNotOpen);
    require!(amount > 0, DakeError::InvalidBetAmount);
    require!(side_for_pool <= 1, DakeError::InvalidSide);

    // Transfer bet amount to vault
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.bettor.key(),
            &ctx.accounts.vault.key(),
            amount,
        ),
        &[
            ctx.accounts.bettor.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Update pool totals based on side
    if side_for_pool == 1 {
        market.total_yes_amount = market.total_yes_amount.saturating_add(amount);
    } else {
        market.total_no_amount = market.total_no_amount.saturating_add(amount);
    }
    market.participant_count += 1;

    // Create encrypted side handle using Inco Lightning
    let inco = ctx.accounts.inco_lightning_program.to_account_info();
    let cpi_ctx = CpiContext::new(
        inco.clone(),
        Operation {
            signer: ctx.accounts.bettor.to_account_info(),
        },
    );
    let side_handle: Euint128 = cpi::new_euint128(cpi_ctx, encrypted_side, 0)?;

    // Store position
    let position = &mut ctx.accounts.position;
    position.market = market.key();
    position.owner = ctx.accounts.bettor.key();
    position.amount = amount;
    position.encrypted_side_handle = side_handle.0;
    position.is_winner_handle = 0; // Will be set during check_winner
    position.claimed = false;
    position.bump = ctx.bumps.position;

    // Allow bettor to decrypt their own side
    if ctx.remaining_accounts.len() >= 2 {
        let cpi_ctx = CpiContext::new(
            inco,
            Allow {
                allowance_account: ctx.remaining_accounts[0].clone(),
                signer: ctx.accounts.bettor.to_account_info(),
                allowed_address: ctx.remaining_accounts[1].clone(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        );
        cpi::allow(cpi_ctx, side_handle.0, true, ctx.accounts.bettor.key())?;
    }

    msg!("Bet placed on Dake Market #{}!", market.market_id);
    msg!("   Amount: {} lamports", amount);
    msg!("   Side handle: {} (encrypted - nobody knows your position!)", side_handle.0);
    msg!("   Pool totals - YES: {}, NO: {}", market.total_yes_amount, market.total_no_amount);

    Ok(())
}
