use anchor_lang::prelude::*;

#[error_code]
pub enum DakeError {
    #[msg("Market is not open for betting")]
    MarketNotOpen,
    #[msg("Market is still open")]
    MarketStillOpen,
    #[msg("Market is not resolved yet")]
    MarketNotResolved,
    #[msg("Market is already resolved")]
    MarketAlreadyResolved,
    #[msg("Bet amount must be greater than zero")]
    InvalidBetAmount,
    #[msg("Not the position owner")]
    NotOwner,
    #[msg("Position already claimed")]
    AlreadyClaimed,
    #[msg("Position not checked yet - call check_winner first")]
    NotChecked,
    #[msg("Not a winner - cannot claim")]
    NotWinner,
    #[msg("Unauthorized - not the market authority")]
    Unauthorized,
    #[msg("No funds in vault")]
    NoFunds,
    #[msg("Invalid side - must be 0 (NO) or 1 (YES)")]
    InvalidSide,
    #[msg("Resolution time not reached yet")]
    ResolutionTimeNotReached,
    #[msg("Question too long - max 256 characters")]
    QuestionTooLong,
}
