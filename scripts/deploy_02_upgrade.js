const bre = require('@nomiclabs/buidler')
const { ethers, upgrades } = bre
const { getSavedContractAddresses, saveContractAddress } = require('./utils')

async function main() {
    await bre.run('compile')

    const contracts = getSavedContractAddresses()[bre.network.name]

    const monetaryPolicy = await ethers.getContractAt('BaseTokenMonetaryPolicy', contracts.baseTokenMonetaryPolicy)
    const orchestrator = await ethers.getContractAt('BaseTokenOrchestrator', contracts.baseTokenOrchestrator)
    const cascade = await ethers.getContractAt('Cascade', contracts.cascade)

    const SBSToken = await ethers.getContractFactory('BaseToken')
    const sbsToken = await upgrades.upgradeProxy(contracts.sbsToken, SBSToken)
    await sbsToken.deployed()

    await (await monetaryPolicy.setBASEToken(sbsToken.address)).wait()
    await (await cascade.setBASEToken(sbsToken.address)).wait()

    console.log('SBSToken re-deployed to:', sbsToken.address)
    saveContractAddress(bre.network.name, 'sbsToken', sbsToken.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
