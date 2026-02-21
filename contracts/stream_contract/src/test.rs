#![cfg(test)]

use super::*;
use soroban_sdk::{Env, testutils::Address as _, Address, token, symbol_short};

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(StreamContract, ());
    let client = StreamContractClient::new(&env, &contract_id);

    // Placeholder test logic
    // 1. Mock addresses
    // 2. Call create_stream
    // 3. Assert stream state
}

#[test]
fn test_top_up_stream_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StreamContract, ());
    let client = StreamContractClient::new(&env, &contract_id);

    // Create mock addresses
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    // Deploy a mock token contract
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();
    let token_client = token::StellarAssetClient::new(&env, &token_address);

    // Mint initial tokens to sender
    token_client.mint(&sender, &1_000_000);

    // Manually create a stream in storage (since create_stream is not fully implemented)
    let stream = Stream {
        sender: sender.clone(),
        recipient: recipient.clone(),
        token_address: token_address.clone(),
        rate_per_second: 100,
        deposited_amount: 10_000,
        withdrawn_amount: 0,
        start_time: env.ledger().timestamp(),
        last_update_time: env.ledger().timestamp(),
        is_active: true,
    };

    let stream_id = 1u64;
    env.as_contract(&contract_id, || {
        let storage = env.storage().persistent();
        storage.set(&(symbol_short!("STREAMS"), stream_id), &stream);
    });

    // Top up the stream with additional funds
    let top_up_amount = 5_000i128;
    let result = client.try_top_up_stream(&sender, &stream_id, &top_up_amount);
    assert!(result.is_ok());

    // Verify the stream was updated
    env.as_contract(&contract_id, || {
        let storage = env.storage().persistent();
        let updated_stream: Stream = storage.get(&(symbol_short!("STREAMS"), stream_id)).unwrap();
        assert_eq!(updated_stream.deposited_amount, 15_000);
    });
}

#[test]
fn test_top_up_stream_invalid_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StreamContract, ());
    let client = StreamContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let stream_id = 1u64;

    // Try to top up with negative amount
    let result = client.try_top_up_stream(&sender, &stream_id, &(-100i128));
    assert_eq!(result, Err(Ok(StreamError::InvalidAmount)));

    // Try to top up with zero amount
    let result = client.try_top_up_stream(&sender, &stream_id, &0i128);
    assert_eq!(result, Err(Ok(StreamError::InvalidAmount)));
}

#[test]
fn test_top_up_stream_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StreamContract, ());
    let client = StreamContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let stream_id = 999u64; // Non-existent stream

    let result = client.try_top_up_stream(&sender, &stream_id, &1_000i128);
    assert_eq!(result, Err(Ok(StreamError::StreamNotFound)));
}

#[test]
fn test_top_up_stream_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StreamContract, ());
    let client = StreamContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let different_sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();

    // Create a stream with original sender
    let stream = Stream {
        sender: sender.clone(),
        recipient: recipient.clone(),
        token_address: token_address.clone(),
        rate_per_second: 100,
        deposited_amount: 10_000,
        withdrawn_amount: 0,
        start_time: env.ledger().timestamp(),
        last_update_time: env.ledger().timestamp(),
        is_active: true,
    };

    let stream_id = 1u64;
    env.as_contract(&contract_id, || {
        let storage = env.storage().persistent();
        storage.set(&(symbol_short!("STREAMS"), stream_id), &stream);
    });

    // Try to top up with different sender
    let result = client.try_top_up_stream(&different_sender, &stream_id, &1_000i128);
    assert_eq!(result, Err(Ok(StreamError::Unauthorized)));
}

#[test]
fn test_top_up_stream_inactive() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StreamContract, ());
    let client = StreamContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_contract.address();

    // Create an inactive stream
    let stream = Stream {
        sender: sender.clone(),
        recipient: recipient.clone(),
        token_address: token_address.clone(),
        rate_per_second: 100,
        deposited_amount: 10_000,
        withdrawn_amount: 0,
        start_time: env.ledger().timestamp(),
        last_update_time: env.ledger().timestamp(),
        is_active: false, // Inactive stream
    };

    let stream_id = 1u64;
    env.as_contract(&contract_id, || {
        let storage = env.storage().persistent();
        storage.set(&(symbol_short!("STREAMS"), stream_id), &stream);
    });

    // Try to top up inactive stream
    let result = client.try_top_up_stream(&sender, &stream_id, &1_000i128);
    assert_eq!(result, Err(Ok(StreamError::StreamInactive)));
}
