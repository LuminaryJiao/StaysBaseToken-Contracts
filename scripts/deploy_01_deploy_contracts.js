const bre = require('@nomiclabs/buidler')
const { ethers, upgrades } = bre
const { getSavedContractAddresses, saveContractAddress } = require('./utils')

async function main() {
    await bre.run('compile')

    const BaseToken = await ethers.getContractFactory('BaseToken')
    const baseToken = await upgrades.deployProxy(BaseToken, [])
    await baseToken.deployed()
    console.log('BaseToken deployed to:', baseToken.address)
    saveContractAddress(bre.network.name, 'baseToken', baseToken.address)

    const BaseTokenMonetaryPolicy = await ethers.getContractFactory('BaseTokenMonetaryPolicy')
    const baseTokenMonetaryPolicy = await upgrades.deployProxy(BaseTokenMonetaryPolicy, [baseToken.address])
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

    await (await baseToken.setMonetaryPolicy(baseTokenMonetaryPolicy.address)).wait()
    console.log('BaseToken.setMonetaryPolicy(', baseTokenMonetaryPolicy.address, ') succeeded')
    await (await baseTokenMonetaryPolicy.setOrchestrator(baseTokenOrchestrator.address)).wait()
    console.log('BaseTokenMonetaryPolicy.setOrchestrator(', baseTokenOrchestrator.address, ') succeeded')

    const contracts = getSavedContractAddresses()[bre.network.name]

    await (await baseTokenMonetaryPolicy.setMcapOracle(contracts.mcapOracle)).wait()
    console.log('BaseTokenMonetaryPolicy.setMcapOracle(', contracts.mcapOracle, ') succeeded')
    await (await baseTokenMonetaryPolicy.setTokenPriceOracle(contracts.tokenPriceOracle)).wait()
    console.log('BaseTokenMonetaryPolicy.setTokenPriceOracle(', contracts.tokenPriceOracle, ') succeeded')
    await (await cascade.setLPToken(contracts.lpToken)).wait()
    console.log('Cascade.setLPToken(', contracts.lpToken, ') succeeded')
    await (await cascade.setBASEToken(contracts.baseToken)).wait()
    console.log('Cascade.setBASEToken(', contracts.baseToken, ') succeeded')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
