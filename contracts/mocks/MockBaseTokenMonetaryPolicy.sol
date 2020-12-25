// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./Mock.sol";


contract MockBaseTokenMonetaryPolicy is Mock {

    function rebase() external {
        emit FunctionCalled("BaseTokenMonetaryPolicy", "rebase", msg.sender);
    }
}
