// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../BaseTokenOrchestrator.sol";


contract ConstructorRebaseCallerContract {
    constructor(address orchestrator) public {
        // Take out a flash loan.
        // Do something funky...
        BaseTokenOrchestrator(orchestrator).rebase();  // should fail
        // pay back flash loan.
    }
}
