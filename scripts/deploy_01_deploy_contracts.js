const bre = require('@nomiclabs/buidler')
const { ethers, upgrades } = bre
const { getSavedContractAddresses, saveContractAddress } = require('./utils')

async function main() {
    await bre.run('compile')

    const SBSToken = await ethers.getContractFactory('BaseToken')
    const sbsToken = await upgrades.deployProxy(SBSToken, [])
    await sbsToken.deployed()
    console.log('SBSToken deployed to:', sbsToken.address)
    saveContractAddress(bre.network.name, 'sbsToken', sbsToken.address)

    const BaseTokenMonetaryPolicy = await ethers.getContractFactory('BaseTokenMonetaryPolicy')
    const baseTokenMonetaryPolicy = await upgrades.deployProxy(BaseTokenMonetaryPolicy, [sbsToken.address])
    await baseTokenMonetaryPolicy.deployed()
    console.log('BaseTokenMonetaryPolicy deployed to:', baseTokenMonetaryPolicy.address)
    saveContractAddress(bre.network.name, 'baseTokenMonetaryPolicy', baseTokenMonetaryPolicy.address)

    const BaseTokenOrchestrator = await ethers.getContractFactory('BaseTokenOrchestrator')
    const baseTokenOrchestrator = await upgrades.deployProxy(BaseTokenOrchestrator, [baseTokenMonetaryPolicy.address])
    await baseTokenOrchestrator.deployed()
    console.log('BaseTokenOrchestrator deployed to:', baseTokenOrchestrator.address)
    saveContractAddress(bre.network.name, 'baseTokenOrchestrator', baseTokenOrchestrator.address)

    const Cascade = await ethers.getContractFactory('Cascade')
    const cascade = await upgrades.deployProxy(Cascade, [])
    await cascade.deployed()
    console.log('Cascade deployed to:', cascade.address)
    saveContractAddress(bre.network.name, 'cascade', cascade.address)

    await (await sbsToken.setMonetaryPolicy(baseTokenMonetaryPolicy.address)).wait()
    console.log('sbsToken.setMonetaryPolicy(', baseTokenMonetaryPolicy.address, ') succeeded')
    await (await baseTokenMonetaryPolicy.setOrchestrator(baseTokenOrchestrator.address)).wait()
    console.log('BaseTokenMonetaryPolicy.setOrchestrator(', baseTokenOrchestrator.address, ') succeeded')

    const contracts = getSavedContractAddresses()[bre.network.name]

    await (await baseTokenMonetaryPolicy.setMcapOracle(contracts.mcapOracle)).wait()
    console.log('BaseTokenMonetaryPolicy.setMcapOracle(', contracts.mcapOracle, ') succeeded')
    await (await baseTokenMonetaryPolicy.setTokenPriceOracle(contracts.tokenPriceOracle)).wait()
    console.log('BaseTokenMonetaryPolicy.setTokenPriceOracle(', contracts.tokenPriceOracle, ') succeeded')
    await (await cascade.setLPToken(contracts.lpToken)).wait()
    console.log('Cascade.setLPToken(', contracts.lpToken, ') succeeded')
    await (await cascade.setBASEToken(contracts.sbsToken)).wait()
    console.log('Cascade.setBASEToken(', contracts.sbsToken, ') succeeded')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
