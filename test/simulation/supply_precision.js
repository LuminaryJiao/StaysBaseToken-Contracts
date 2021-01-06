/*
    In this buidler script,
    During every iteration:
    * We double the total BASE supply.
    * We test the following guarantee:
            - the difference in totalSupply() before and after the rebase(+1) should be exactly 1.

    USAGE:
    buidler run ./test/simulation/supply_precision.js
*/

const { ethers, web3, upgrades, expect, BigNumber, isEthException, awaitTx, waitForSomeTime, currentTime, toBASEDenomination } = require('../setup')

const endSupply = BigNumber.from(2).pow(128).sub(1)

let baseToken, preRebaseSupply, postRebaseSupply
preRebaseSupply = BigNumber.from(0)
postRebaseSupply = BigNumber.from(0)

async function exec() {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    console.log('get account success', await deployer.getAddress());
    
    const BaseToken = await ethers.getContractFactory('BaseToken')

    console.log('------- BaseToken address', BaseToken.address);
    baseToken = await upgrades.deployProxy(BaseToken, [])
    await baseToken.deployed()
    console.log('baseToken deployed', baseToken.address);
    baseToken = baseToken.connect(deployer)

    const monetaryPolicyAddress = await deployer.getAddress();
    console.log('Setting monetaryPolicyAddress', monetaryPolicyAddress);
    await awaitTx(baseToken.setMonetaryPolicy(monetaryPolicyAddress));
    console.log('baseToken configure done');

    let i = 0
    do {
        console.log('Iteration', i + 1)

        preRebaseSupply = await baseToken.totalSupply()
        console.log('-------- Before rebase, total supply is:', preRebaseSupply.toString(), 'BASE');
        await awaitTx(baseToken.rebase(2 * i, 1))
        console.log('-------- Rebased by 1 BASE success getting supply');
        postRebaseSupply = await baseToken.totalSupply()
        console.log('-------- Total supply is now', postRebaseSupply.toString(), 'BASE')

        console.log('Testing precision of supply')
        expect(postRebaseSupply.sub(preRebaseSupply).toNumber()).to.equal(1)

        console.log('Doubling supply')
        await awaitTx(baseToken.rebase(2 * i + 1, postRebaseSupply))
        console.log('Doubling supply done');
        i++
    } while ((await baseToken.totalSupply()).lt(endSupply))
}

exec()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

