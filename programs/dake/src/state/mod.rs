use anchor_lang::prelude::*;

/// Market status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketStatus {
    Open,        // Accepting bets
    Closed,      // No more bets, awaiting resolution
    ResolvedYes, // Resolved - YES won
    ResolvedNo,  // Resolved - NO won
}

impl Default for MarketStatus {
    fn default() -> Self {
        MarketStatus::Open
    }
}

/// Prediction Market account
///
/// Privacy model:
/// - Individual bet SIDES (YES/NO) are encrypted - nobody knows your position
/// - Bet AMOUNTS are public - needed for proportional payout calculation
/// - On resolution, winners prove their side via decryption to claim
#[account]
pub struct Market {
    /// Authority who can resolve the market
    pub authority: Pubkey,
    /// Unique market identifier
    pub market_id: u64,
    /// The prediction question (e.g., "Will SOL hit $500 by March 2026?")
    pub question: String,
    /// When the market can be resolved (Unix timestamp)
    pub resolution_time: i64,
    /// Current market status
    pub status: MarketStatus,
    /// Total amount bet on YES side (public, for payout calculation)
    pub total_yes_amount: u64,
    /// Total amount bet on NO side (public, for payout calculation)
    pub total_no_amount: u64,
    /// Number of participants
    pub participant_count: u32,
    /// PDA bump seed
    pub bump: u8,
}

impl Market {
    // 8 (discriminator) + 32 (authority) + 8 (market_id) + 4 + 256 (question) + 8 (resolution_time)
    // + 1 (status) + 8 (total_yes) + 8 (total_no) + 4 (participant_count) + 1 (bump) + padding
    pub const SIZE: usize = 8 + 32 + 8 + (4 + 256) + 8 + 1 + 8 + 8 + 4 + 1 + 64;

    pub fn is_open(&self) -> bool {
        self.status == MarketStatus::Open
    }

    pub fn is_resolved(&self) -> bool {
        matches!(self.status, MarketStatus::ResolvedYes | MarketStatus::ResolvedNo)
    }

    pub fn total_pool(&self) -> u64 {
        self.total_yes_amount.saturating_add(self.total_no_amount)
    }
}

/// User's position in a market
///
/// Privacy: The SIDE (YES=1, NO=0) is stored as an encrypted handle.
/// Nobody can see which side you bet on until you choose to reveal (or claim winnings).
#[account]
pub struct Position {
    /// The market this position belongs to
    pub market: Pubkey,
    /// Owner of this position
    pub owner: Pubkey,
    /// Bet amount in lamports (public - needed for payout calculation)
    pub amount: u64,
    /// Locked payout amount - calculated at bet time, NEVER changes
    /// This ensures your profit is guaranteed regardless of future bets
    pub locked_payout: u64,
    /// Encrypted side handle: 1 = YES, 0 = NO (private!)
    pub encrypted_side_handle: u128,
    /// Encrypted result of (user_side == winning_side) comparison
    pub is_winner_handle: u128,
    /// Whether winnings have been claimed
    pub claimed: bool,
    /// PDA bump seed
    pub bump: u8,
}

impl Position {
    // 8 (discriminator) + 32 (market) + 32 (owner) + 8 (amount) + 8 (locked_payout) + 16 (encrypted_side)
    // + 16 (is_winner) + 1 (claimed) + 1 (bump) + padding
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 16 + 16 + 1 + 1 + 32;
}
