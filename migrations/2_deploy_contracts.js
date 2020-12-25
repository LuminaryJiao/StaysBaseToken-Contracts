var ERC20UpgradeSafe = artifacts.require("ERC20UpgradeSafe");
var MockOracle = artifacts.require("MockOracle");

var BaseToken = artifacts.require("BaseToken");
var LPToken = artifacts.require("LPToken");
var BaseTokenMonetaryPolicy = artifacts.require("BaseTokenMonetaryPolicy");
var BaseTokenOrchestrator = artifacts.require("BaseTokenOrchestrator");
var Cascade = artifacts.require("Cascade");

module.exports = async function (deployer) {

  /// for testnet
  await deployer.deploy(MockOracle, 'TestMockOracle');
  let mcapOracle = await deployer.deploy(MockOracle, 'MCapOracle');
  let tokenPriceOracle = await deployer.deploy(MockOracle, 'TokenPriceOracle');
  let lpToken = await deployer.deploy(LPToken);


  /// for mainnet
  let baseTokenMonetaryPolicy = await deployer.deploy(BaseTokenMonetaryPolicy);
  let baseTokenOrchestrator = await deployer.deploy(BaseTokenOrchestrator);
  let sbsToken = await deployer.deploy(BaseToken);
  let cascade = await deployer.deploy(Cascade);

  console.log(`****** Testnet MockOracle > MCapOracle deployed -> '${mcapOracle && mcapOracle.address}'`);
  console.log(`****** Testnet MockOracle > TokenPriceOracle deployed -> '${tokenPriceOracle && tokenPriceOracle.address}'`);
  console.log(`****** Testnet LPToken deployed -> '${lpToken && lpToken.address}'`);

  console.log(`****** BaseTokenMonetaryPolicy deployed -> '${baseTokenMonetaryPolicy && baseTokenMonetaryPolicy.address}'`);
  console.log(`****** BaseTokenOrchestrator deployed -> '${baseTokenOrchestrator && baseTokenOrchestrator.address}'`);
  console.log(`****** SBSToken deployed -> '${sbsToken && sbsToken.address}'`);
  console.log(`****** Cascade deployed -> '${cascade && cascade.address}'`);

  await sbsToken.initialize();
  console.log(`****** sbsToken.initialize()`);
  await sbsToken.setMonetaryPolicy(baseTokenMonetaryPolicy.address);
  console.log(`****** sbsToken.setMonetaryPolicy('${baseTokenMonetaryPolicy && baseTokenMonetaryPolicy.address}')`);

  await baseTokenMonetaryPolicy.initialize(sbsToken.address);
  console.log(`****** baseTokenMonetaryPolicy.initialize('${sbsToken && sbsToken.address}')`);
  await baseTokenMonetaryPolicy.setOrchestrator(baseTokenOrchestrator.address);
  console.log(`****** baseTokenMonetaryPolicy.setOrchestrator('${baseTokenOrchestrator && baseTokenOrchestrator.address}')`);
  await baseTokenMonetaryPolicy.setMcapOracle(mcapOracle.address);
  console.log(`****** baseTokenMonetaryPolicy.setMcapOracle('${mcapOracle && mcapOracle.address}')`);
  await baseTokenMonetaryPolicy.setTokenPriceOracle(mcapOracle.address);
  console.log(`****** baseTokenMonetaryPolicy.setTokenPriceOracle('${tokenPriceOracle && tokenPriceOracle.address}')`);

  await cascade.initialize();
  console.log(`****** cascade.initialize()`);
  await cascade.setLPToken(lpToken.address);
  console.log(`****** cascade.setLPToken('${lpToken && lpToken.address}')`);
  await cascade.setBASEToken(sbsToken.address);
  console.log(`****** cascade.setBASEToken('${sbsToken && sbsToken.address}')`);
};