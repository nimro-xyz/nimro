// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NimroJobLedger} from "../src/NimroJobLedger.sol";

/// Stand-in for the ArbSys precompile so the chain-block path can be exercised locally.
contract FakeArbSys {
    uint256 public n;
    function set(uint256 v) external { n = v; }
    function arbBlockNumber() external view returns (uint256) { return n; }
}

/// ArbSys stand-in that burns all gas it gets (a broken precompile must not take the transaction with it).
contract GreedyArbSys {
    fallback() external {
        while (true) {}
    }
}

contract NimroJobLedgerTest is Test {
    NimroJobLedger ledger;
    address constant ALICE = address(0xA11CE);
    address constant BOB = address(0xB0B);
    bytes32 constant SPEC = keccak256("spec one");
    bytes32 constant SPEC2 = keccak256("spec two");
    bytes32 constant RES = keccak256("result one");
    bytes32 constant RES2 = keccak256("result two");

    event JobRecorded(uint256 indexed id, address indexed runner, bytes32 indexed specHash, bytes32 resultHash, uint8 kind, uint32 durationMs, uint64 recordedBlock);

    function setUp() public {
        vm.roll(1000);
        vm.warp(1_700_000_000);
        ledger = new NimroJobLedger();
    }

    function test_recordStoresRunAndEmits() public {
        vm.expectEmit(true, true, true, true);
        emit JobRecorded(1, ALICE, SPEC, RES, 2, 1234, 1000);
        vm.prank(ALICE);
        uint256 id = ledger.record(SPEC, RES, 2, 1234);
        assertEq(id, 1);
        assertEq(ledger.runCount(), 1);
        NimroJobLedger.Run memory r = ledger.run(1);
        assertEq(r.runner, ALICE);
        assertEq(r.kind, 2);
        assertEq(r.durationMs, 1234);
        assertEq(r.recordedBlock, 1000);
        assertEq(r.recordedAt, 1_700_000_000);
        assertEq(r.specHash, SPEC);
        assertEq(r.resultHash, RES);
        assertEq(ledger.runOf(ALICE, SPEC, RES), 1);
        assertEq(ledger.runOf(BOB, SPEC, RES), 0);
        assertEq(ledger.specRunCount(SPEC), 1);
        assertEq(ledger.runnerRunCount(ALICE), 1);
    }

    function test_zeroDurationIsAccepted() public {
        vm.prank(ALICE);
        assertEq(ledger.record(SPEC, RES, 1, 0), 1);
    }

    function test_maxValuesAccepted() public {
        vm.prank(ALICE);
        ledger.record(SPEC, RES, ledger.MAX_KIND(), type(uint32).max);
        assertEq(ledger.run(1).durationMs, type(uint32).max);
    }

    function test_revertsOnZeroSpec() public {
        vm.expectRevert(NimroJobLedger.ZeroSpec.selector);
        ledger.record(bytes32(0), RES, 1, 1);
    }

    function test_revertsOnZeroResult() public {
        vm.expectRevert(NimroJobLedger.ZeroResult.selector);
        ledger.record(SPEC, bytes32(0), 1, 1);
    }

    function test_revertsOnKindZero() public {
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.UnknownKind.selector, uint8(0)));
        ledger.record(SPEC, RES, 0, 1);
    }

    function test_revertsOnKindAboveMax() public {
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.UnknownKind.selector, uint8(33)));
        ledger.record(SPEC, RES, 33, 1);
    }

    function test_sameRunnerSameRunRefused() public {
        vm.startPrank(ALICE);
        ledger.record(SPEC, RES, 1, 5);
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.AlreadyRecorded.selector, uint256(1)));
        ledger.record(SPEC, RES, 3, 9);
        vm.stopPrank();
    }

    function test_differentResultForSameSpecIsAllowed() public {
        vm.startPrank(ALICE);
        ledger.record(SPEC, RES, 1, 5);
        ledger.record(SPEC, RES2, 1, 5);
        vm.stopPrank();
        assertEq(ledger.specRunCount(SPEC), 2);
    }

    function test_otherRunnerSameRunIsAllowed() public {
        vm.prank(ALICE);
        ledger.record(SPEC, RES, 1, 5);
        vm.prank(BOB);
        uint256 id = ledger.record(SPEC, RES, 1, 7);
        assertEq(id, 2);
        assertEq(ledger.runOf(BOB, SPEC, RES), 2);
    }

    function test_unknownRunReverts() public {
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.UnknownRun.selector, uint256(0)));
        ledger.run(0);
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.UnknownRun.selector, uint256(1)));
        ledger.run(1);
    }

    function test_pagesNewestFirst() public {
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(ALICE);
            ledger.record(SPEC, keccak256(abi.encode(i)), 1, 1);
        }
        vm.prank(BOB);
        ledger.record(SPEC2, RES, 1, 1);
        uint256[] memory ids = ledger.specRuns(SPEC, 0, 3);
        assertEq(ids.length, 3);
        assertEq(ids[0], 5);
        assertEq(ids[1], 4);
        assertEq(ids[2], 3);
        ids = ledger.specRuns(SPEC, 3, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], 2);
        assertEq(ids[1], 1);
        assertEq(ledger.specRuns(SPEC, 5, 10).length, 0);
        assertEq(ledger.specRuns(SPEC, 0, 0).length, 0);
        ids = ledger.runnerRuns(ALICE, 1, 2);
        assertEq(ids[0], 4);
        assertEq(ids[1], 3);
        ids = ledger.runnerRuns(BOB, 0, 5);
        assertEq(ids.length, 1);
        assertEq(ids[0], 6);
    }

    function test_pageIsCapped() public {
        for (uint256 i = 0; i < 105; i++) {
            ledger.record(SPEC, keccak256(abi.encode(i)), 1, 1);
        }
        assertEq(ledger.specRuns(SPEC, 0, 1000).length, 100);
        assertEq(ledger.runnerRuns(address(this), 0, type(uint256).max).length, 100);
    }

    function test_chainBlockUsesArbSysWhenPresent() public {
        FakeArbSys fake = new FakeArbSys();
        vm.etch(address(0x64), address(fake).code);
        FakeArbSys(address(0x64)).set(95_000_000);
        assertEq(ledger.chainBlock(), 95_000_000);
        vm.prank(ALICE);
        ledger.record(SPEC, RES, 1, 1);
        assertEq(ledger.run(1).recordedBlock, 95_000_000);
    }

    function test_chainBlockFallsBackWhenArbSysReturnsZero() public {
        FakeArbSys fake = new FakeArbSys();
        vm.etch(address(0x64), address(fake).code);
        assertEq(ledger.chainBlock(), 1000);
    }

    function test_chainBlockFallsBackWhenArbSysBurnsGas() public {
        GreedyArbSys g = new GreedyArbSys();
        vm.etch(address(0x64), address(g).code);
        uint256 before = gasleft();
        assertEq(ledger.chainBlock(), 1000);
        assertLt(before - gasleft(), 60_000);
        vm.prank(ALICE);
        ledger.record(SPEC, RES, 1, 1);
    }

    function test_rejectsEth() public {
        vm.deal(ALICE, 1 ether);
        vm.prank(ALICE);
        (bool ok, ) = address(ledger).call{value: 1}("");
        assertFalse(ok);
        assertEq(address(ledger).balance, 0);
    }

    function testFuzz_recordRoundTrip(address who, bytes32 spec, bytes32 res, uint8 kind, uint32 duration) public {
        vm.assume(spec != bytes32(0) && res != bytes32(0));
        kind = uint8(bound(kind, 1, ledger.MAX_KIND()));
        vm.prank(who);
        uint256 id = ledger.record(spec, res, kind, duration);
        NimroJobLedger.Run memory r = ledger.run(id);
        assertEq(r.runner, who);
        assertEq(r.kind, kind);
        assertEq(r.durationMs, duration);
        assertEq(r.specHash, spec);
        assertEq(r.resultHash, res);
        assertEq(ledger.runOf(who, spec, res), id);
        vm.prank(who);
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.AlreadyRecorded.selector, id));
        ledger.record(spec, res, kind, duration);
    }

    function testFuzz_badKindAlwaysRefused(uint8 kind) public {
        vm.assume(kind == 0 || kind > ledger.MAX_KIND());
        vm.expectRevert(abi.encodeWithSelector(NimroJobLedger.UnknownKind.selector, kind));
        ledger.record(SPEC, RES, kind, 1);
    }

    function testFuzz_pagingNeverExceedsBounds(uint8 n, uint256 offset, uint256 limit) public {
        n = uint8(bound(n, 0, 40));
        for (uint256 i = 0; i < n; i++) ledger.record(SPEC, keccak256(abi.encode(i)), 1, 1);
        uint256[] memory ids = ledger.specRuns(SPEC, offset, limit);
        uint256 expected = offset >= n ? 0 : n - offset;
        uint256 cap = limit > 100 ? 100 : limit;
        if (expected > cap) expected = cap;
        assertEq(ids.length, expected);
        for (uint256 i = 0; i < ids.length; i++) {
            assertEq(ids[i], n - offset - i);
        }
    }
}
