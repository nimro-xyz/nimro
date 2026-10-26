// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NimroJobLedger} from "../../src/NimroJobLedger.sol";

/// Fork test against Robinhood Chain mainnet:
///   forge test --match-path 'test/fork/*' --fork-url https://rpc.mainnet.chain.robinhood.com --evm-version cancun
contract NimroForkTest is Test {
    function setUp() public {
        vm.skip(block.chainid != 4663);
    }

    function test_fork_recordOnForkedChain() public {
        NimroJobLedger ledger = new NimroJobLedger();
        uint64 nowBlock = ledger.chainBlock();
        assertGt(nowBlock, 0);
        bytes32 spec = keccak256("fork spec");
        bytes32 res = keccak256("fork result");
        uint256 id = ledger.record(spec, res, 1, 42);
        NimroJobLedger.Run memory r = ledger.run(id);
        assertEq(r.recordedBlock, nowBlock);
        assertEq(ledger.specRunCount(spec), 1);
    }

    function test_fork_chainBlockIsTheChainsOwnBlock() public {
        NimroJobLedger ledger = new NimroJobLedger();
        // On a fork ArbSys is not emulated; the contract falls back to the forked block number, which is the
        // chain's own block (tens of millions), not the parent-chain block.
        assertEq(ledger.chainBlock(), uint64(block.number));
        assertGt(block.number, 90_000_000);
    }
}
