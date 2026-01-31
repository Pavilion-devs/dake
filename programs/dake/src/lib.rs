#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("5apEYrFFuxT7yExEFz56kfmuYvc1YxcActFCMWnYpQea");

#[program]
pub mod dake {
    use super::*;

    /// Create a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        question: String,
        resolution_time: i64,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, market_id, question, resolution_time)
    }

    /// Place a bet on a prediction market
    /// - encrypted_side: Encrypted value (1 = YES, 0 = NO)
    /// - amount: Bet amount in lamports
    /// - side_for_pool: The side to update pool totals (must match encrypted value)
    pub fn place_bet<'info>(
        ctx: Context<'_, '_, '_, 'info, PlaceBet<'info>>,
        encrypted_side: Vec<u8>,
        amount: u64,
        side_for_pool: u8,
    ) -> Result<()> {
        instructions::place_bet::handler(ctx, encrypted_side, amount, side_for_pool)
    }

    /// Close a market for betting
    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        instructions::close_market::handler(ctx)
    }

    /// Resolve a market with the outcome
    /// - outcome: true = YES wins, false = NO wins
    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        instructions::resolve_market::handler(ctx, outcome)
    }

    /// Check if a position is a winner (encrypted comparison)
    pub fn check_winner<'info>(
        ctx: Context<'_, '_, '_, 'info, CheckWinner<'info>>,
    ) -> Result<()> {
        instructions::check_winner::handler(ctx)
    }

    /// Claim winnings by proving winner status
    pub fn claim_winnings(
        ctx: Context<ClaimWinnings>,
        handle: Vec<u8>,
        plaintext: Vec<u8>,
    ) -> Result<()> {
        instructions::claim_winnings::handler(ctx, handle, plaintext)
    }

    /// Grant decrypt access for is_winner_handle (call after check_winner)
    pub fn grant_decrypt_access<'info>(
        ctx: Context<'_, '_, '_, 'info, GrantDecryptAccess<'info>>,
    ) -> Result<()> {
        instructions::grant_decrypt_access::handler(ctx)
    }
}
