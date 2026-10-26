// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NimroJobLedger
/// @notice Public, append-only record of compute jobs that someone ran on their own device. A runner records the
///         keccak-256 hash of a job specification, the keccak-256 hash of the result it produced, the job kind and
///         the duration it measured. Anyone can later rerun the same specification, hash the result and compare it
///         with what was recorded.
///         A record proves "this address said this specification produced this result, at this block". The
///         duration is self-reported and the contract cannot check that the result is correct: recomputing it is
///         the check, and the site's verify page does exactly that.
/// @dev No owner, no admin, no fee, no pause, no upgrade path, no constructor arguments. The contract never holds
///      funds: no function is payable and there is no receive or fallback, so ETH transfers revert.
///      On Arbitrum-style chains `block.number` reports the parent chain's block, so the chain's own block is read
///      from the ArbSys precompile when it answers, and from `block.number` everywhere else (local tests).
contract NimroJobLedger {
    struct Run {
        address runner;
        uint8 kind;
        uint32 durationMs;
        uint64 recordedBlock;
        uint64 recordedAt;
        bytes32 specHash;
        bytes32 resultHash;
    }

    /// @notice Highest job kind accepted. Kinds start at 1; the site uses 1 to 4 and leaves room for more.
    uint8 public constant MAX_KIND = 32;
    /// @notice Most ids returned by one paged read.
    uint256 public constant MAX_PAGE = 100;

    /// @dev ArbSys precompile. `arbBlockNumber()` returns the chain's own block number.
    address private constant ARB_SYS = address(0x64);
    bytes4 private constant ARB_BLOCK_NUMBER = 0xa3b1b31d;
    /// @dev Gas forwarded to ArbSys. The real precompile needs about a thousand; the cap keeps a chain (or a local
    ///      fork) where 0x64 holds failing code from burning the whole transaction's gas.
    uint256 private constant ARB_SYS_GAS = 30_000;

    /// @notice Number of runs ever recorded. Run ids start at 1.
    uint256 public runCount;

    mapping(uint256 id => Run) private _runs;
    /// @dev One record per (runner, spec hash, result hash).
    mapping(bytes32 key => uint256) private _byRunner;
    /// @dev Run ids per specification, in recording order.
    mapping(bytes32 specHash => uint256[]) private _specRuns;
    /// @dev Run ids per runner, in recording order.
    mapping(address runner => uint256[]) private _runnerRuns;

    event JobRecorded(
        uint256 indexed id,
        address indexed runner,
        bytes32 indexed specHash,
        bytes32 resultHash,
        uint8 kind,
        uint32 durationMs,
        uint64 recordedBlock
    );

    error ZeroSpec();
    error ZeroResult();
    error UnknownKind(uint8 kind);
    error AlreadyRecorded(uint256 id);
    error UnknownRun(uint256 id);

    /// @notice Records a job run.
    /// @param specHash keccak-256 of the canonical job specification.
    /// @param resultHash keccak-256 of the canonical job result.
    /// @param kind Job kind, 1 to MAX_KIND.
    /// @param durationMs Duration the runner measured, in milliseconds (self-reported).
    /// @return id The new run id.
    function record(bytes32 specHash, bytes32 resultHash, uint8 kind, uint32 durationMs) external returns (uint256 id) {
        if (specHash == bytes32(0)) revert ZeroSpec();
        if (resultHash == bytes32(0)) revert ZeroResult();
        if (kind == 0 || kind > MAX_KIND) revert UnknownKind(kind);

        bytes32 key = keccak256(abi.encode(msg.sender, specHash, resultHash));
        uint256 prior = _byRunner[key];
        if (prior != 0) revert AlreadyRecorded(prior);

        uint64 nowBlock = chainBlock();
        id = ++runCount;
        _byRunner[key] = id;
        _specRuns[specHash].push(id);
        _runnerRuns[msg.sender].push(id);
        _runs[id] = Run({
            runner: msg.sender,
            kind: kind,
            durationMs: durationMs,
            recordedBlock: nowBlock,
            recordedAt: uint64(block.timestamp),
            specHash: specHash,
            resultHash: resultHash
        });
        emit JobRecorded(id, msg.sender, specHash, resultHash, kind, durationMs, nowBlock);
    }

    /// @notice The run with id `id`. Reverts for an id that does not exist.
    function run(uint256 id) external view returns (Run memory) {
        if (id == 0 || id > runCount) revert UnknownRun(id);
        return _runs[id];
    }

    /// @notice The run `runner` recorded for this spec and result, or 0 when there is none.
    function runOf(address runner, bytes32 specHash, bytes32 resultHash) external view returns (uint256) {
        return _byRunner[keccak256(abi.encode(runner, specHash, resultHash))];
    }

    /// @notice How many runs exist for `specHash`.
    function specRunCount(bytes32 specHash) external view returns (uint256) {
        return _specRuns[specHash].length;
    }

    /// @notice Up to `limit` (max MAX_PAGE) run ids for `specHash`, newest first, skipping the `offset` newest.
    function specRuns(bytes32 specHash, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _page(_specRuns[specHash], offset, limit);
    }

    /// @notice How many runs `runner` has recorded.
    function runnerRunCount(address runner) external view returns (uint256) {
        return _runnerRuns[runner].length;
    }

    /// @notice Up to `limit` (max MAX_PAGE) run ids recorded by `runner`, newest first, skipping the `offset` newest.
    function runnerRuns(address runner, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _page(_runnerRuns[runner], offset, limit);
    }

    /// @notice The chain's current block: ArbSys `arbBlockNumber()` when the precompile answers, else `block.number`.
    function chainBlock() public view returns (uint64) {
        (bool ok, bytes memory ret) = ARB_SYS.staticcall{gas: ARB_SYS_GAS}(abi.encodeWithSelector(ARB_BLOCK_NUMBER));
        if (ok && ret.length == 32) {
            uint256 n = abi.decode(ret, (uint256));
            if (n != 0 && n <= type(uint64).max) return uint64(n);
        }
        return uint64(block.number);
    }

    function _page(uint256[] storage all, uint256 offset, uint256 limit) private view returns (uint256[] memory ids) {
        uint256 n = all.length;
        if (limit > MAX_PAGE) limit = MAX_PAGE;
        if (offset >= n || limit == 0) return new uint256[](0);
        uint256 count = n - offset;
        if (count > limit) count = limit;
        ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = all[n - 1 - offset - i];
        }
    }
}
