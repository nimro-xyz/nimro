// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NimroJobLedger} from "../src/NimroJobLedger.sol";

contract LedgerHandler is Test {
    NimroJobLedger public ledger;
    address[3] public actors = [address(0x1001), address(0x1002), address(0x1003)];
    bytes32[3] public specs = [keccak256("s1"), keccak256("s2"), keccak256("s3")];
    uint256 public ghostRuns;
    mapping(bytes32 => uint256) public ghostPerSpec;
    mapping(address => uint256) public ghostPerActor;

    constructor(NimroJobLedger l) { ledger = l; }

    function recordRun(uint256 a, uint256 s, uint8 resultSeed, uint8 kind, uint32 duration) external {
        address who = actors[a % 3];
        bytes32 spec = specs[s % 3];
        bytes32 res = keccak256(abi.encode(resultSeed % 8));
        kind = uint8(bound(kind, 0, 40));
        vm.prank(who);
        try ledger.record(spec, res, kind, duration) returns (uint256) {
            ghostRuns++;
            ghostPerSpec[spec]++;
            ghostPerActor[who]++;
        } catch {}
    }

    function roll(uint8 n) external { vm.roll(block.number + 1 + (n % 20)); }
}

contract NimroJobLedgerInvariantTest is Test {
    NimroJobLedger ledger;
    LedgerHandler handler;

    function setUp() public {
        vm.roll(100);
        ledger = new NimroJobLedger();
        handler = new LedgerHandler(ledger);
        targetContract(address(handler));
    }

    function invariant_countsMatchGhost() public view {
        assertEq(ledger.runCount(), handler.ghostRuns());
        uint256 sumSpecs;
        uint256 sumActors;
        for (uint256 i = 0; i < 3; i++) {
            assertEq(ledger.specRunCount(handler.specs(i)), handler.ghostPerSpec(handler.specs(i)));
            assertEq(ledger.runnerRunCount(handler.actors(i)), handler.ghostPerActor(handler.actors(i)));
            sumSpecs += ledger.specRunCount(handler.specs(i));
            sumActors += ledger.runnerRunCount(handler.actors(i));
        }
        assertEq(sumSpecs, ledger.runCount());
        assertEq(sumActors, ledger.runCount());
    }

    function invariant_runsConsistent() public view {
        uint256 n = ledger.runCount();
        uint64 lastBlock;
        for (uint256 id = 1; id <= n; id++) {
            NimroJobLedger.Run memory r = ledger.run(id);
            assertTrue(r.specHash != bytes32(0) && r.resultHash != bytes32(0));
            assertTrue(r.kind >= 1 && r.kind <= ledger.MAX_KIND());
            assertEq(ledger.runOf(r.runner, r.specHash, r.resultHash), id);
            assertGe(r.recordedBlock, lastBlock);
            lastBlock = r.recordedBlock;
        }
    }

    function invariant_holdsNoEth() public view {
        assertEq(address(ledger).balance, 0);
    }
}
