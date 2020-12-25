const bre = require('@nomiclabs/buidler')
const { ethers, upgrades } = bre
const { getSavedContractAddresses, saveContractAddress } = require('./utils')

async function main() {
    await bre.run('compile')

    const contracts = getSavedContractAddresses()[bre.network.name]

    const monetaryPolicy = await ethers.getContractAt('BaseTokenMonetaryPolicy', contracts.baseTokenMonetaryPolicy)
    const orchestrator = await ethers.getContractAt('BaseTokenOrchestrator', contracts.baseTokenOrchestrator)
    const cascade = await ethers.getContractAt('Cascade', contracts.cascade)

    const BaseToken = await ethers.getContractFactory('BaseToken')
    const baseToken = await upgrades.upgradeProxy(contracts.baseToken, BaseToken)
    await baseToken.deployed()

    await (await monetaryPolicy.setBASEToken(baseToken.address)).wait()
    await (await cascade.setBASEToken(baseToken.address)).wait()

    console.log('BaseToken re-deployed to:', baseToken.address)
    saveContractAddress(bre.network.name, 'baseToken', baseToken.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
