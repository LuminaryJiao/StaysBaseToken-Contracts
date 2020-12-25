const { expectRevert } = require('@openzeppelin/test-helpers')
const { ethers, web3, upgrades, expect, BigNumber, isEthException, awaitTx, waitForSomeTime, currentTime, toBASEDenomination } = require('../setup')

let orchestrator, MockBaseTokenMonetaryPolicy, mockBaseTokenMonetaryPolicy, MockDownstream, mockDownstream
let r
let deployer, deployerAddr, user, userAddr

async function setupContracts () {
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    deployerAddr = await deployer.getAddress()
    user = accounts[1]
    userAddr = await user.getAddress()
    p = deployer.provider

    await waitForSomeTime(p, 86400)

    MockBaseTokenMonetaryPolicy = await ethers.getContractFactory('MockBaseTokenMonetaryPolicy')
    mockBaseTokenMonetaryPolicy = await MockBaseTokenMonetaryPolicy.deploy()
    await mockBaseTokenMonetaryPolicy.deployed()
    mockBaseTokenMonetaryPolicy = mockBaseTokenMonetaryPolicy.connect(deployer)

    const BaseTokenOrchestrator = await ethers.getContractFactory('BaseTokenOrchestrator')
    orchestrator = await upgrades.deployProxy(BaseTokenOrchestrator, [mockBaseTokenMonetaryPolicy.address])
    await orchestrator.deployed()
    orchestrator = orchestrator.connect(deployer)

    MockDownstream = await ethers.getContractFactory('MockDownstream')
    mockDownstream = await MockDownstream.deploy()
    await mockDownstream.deployed()
    mockDownstream = mockDownstream.connect(deployer)
}

describe('BaseTokenOrchestrator', () => {
    before('setup BaseTokenOrchestrator contract', setupContracts)

    describe('when sent ether', async () => {
        it('should reject', async () => {
            expect(
                await isEthException(user.sendTransaction({ to: orchestrator.address, value: 1 }))
            ).to.be.true
        })
    })

    describe('when rebase called by a contract', () => {
        it('should fail', async () => {
            const RebaseCallerContract = await ethers.getContractFactory('RebaseCallerContract')
            rebaseCallerContract = await RebaseCallerContract.deploy()
            await rebaseCallerContract.deployed()
            rebaseCallerContract = rebaseCallerContract.connect(deployer)
            expect(
                await isEthException(rebaseCallerContract.callRebase(orchestrator.address))
            ).to.be.true
        })
    })

    describe('when rebase called by a contract which is being constructed', () => {
        it('should fail', async () => {
            const ConstructorRebaseCallerContract = await ethers.getContractFactory('ConstructorRebaseCallerContract')
            // constructorRebaseCallerContract = await upgrades.deployProxy(ConstructorRebaseCallerContract, [mockBaseTokenMonetaryPolicy.address])
            // await constructorRebaseCallerContract.deployed()
            expect(
                await isEthException(ConstructorRebaseCallerContract.deploy(orchestrator.address))
            ).to.be.true
        })
    })

    describe('when transaction list is empty', async () => {
        before('calling rebase', async () => {
            r = await awaitTx(orchestrator.rebase())
        })

        it('should have no transactions', async () => {
            (await orchestrator.transactionsSize()).should.equal(0)
        })

        it('should call rebase on policy', async () => {
            const fnCalled = MockBaseTokenMonetaryPolicy.interface.decodeEventLog('FunctionCalled', r.events[0].data)
            expect(fnCalled[0]).to.equal('BaseTokenMonetaryPolicy')
            expect(fnCalled[1]).to.equal('rebase')
            expect(fnCalled[2]).to.equal(orchestrator.address)
        })

        it('should not have any subsequent logs', async () => {
            expect(r.events.length).to.equal(1)
        })
    })

    describe('when there is a single transaction', async () => {
        before('adding a transaction', async () => {
            const updateOneArgEncoded = MockDownstream.interface.encodeFunctionData('updateOneArg', [12345])
            await awaitTx(orchestrator.connect(deployer).addTransaction(mockDownstream.address, updateOneArgEncoded))
            r = await awaitTx(orchestrator.rebase())
        })

        it('should have 1 transaction', async () => {
            (await orchestrator.transactionsSize()).should.equal(1)
        })

        it('should call rebase on policy', async () => {
            const fnCalled = MockBaseTokenMonetaryPolicy.interface.decodeEventLog('FunctionCalled', r.events[0].data)
            expect(fnCalled[0]).to.equal('BaseTokenMonetaryPolicy')
            expect(fnCalled[1]).to.equal('rebase')
            expect(fnCalled[2]).to.equal(orchestrator.address)
        })

        it('should call the transaction', async () => {
            const fnCalled = MockDownstream.interface.decodeEventLog('FunctionCalled', r.events[1].data)
            expect(fnCalled[0]).to.equal('MockDownstream')
            expect(fnCalled[1]).to.equal('updateOneArg')
            expect(fnCalled[2]).to.equal(orchestrator.address)

            const fnArgs = MockDownstream.interface.decodeEventLog('FunctionArguments', r.events[2].data)
            const parsedFnArgs = fnArgs.reduce((m, k) => {
                return k.map(d => d.toNumber()).concat(m)
            }, [])
            expect(parsedFnArgs).to.have.lengthOf(1)
            expect(parsedFnArgs[0]).to.equal(12345)
        })

        it('should not have any subsequent logs', async () => {
            expect(r.logs.length).to.equal(3)
        })
    })

    describe('when there are two transactions', async () => {
        before('adding a transaction', async () => {
            const updateTwoArgsEncoded = MockDownstream.interface.encodeFunctionData('updateTwoArgs', [12345, 23456])
            await awaitTx(orchestrator.addTransaction(mockDownstream.address, updateTwoArgsEncoded))
            r = await awaitTx(orchestrator.rebase())
        })

        it('should have 2 transactions', async () => {
            (await orchestrator.transactionsSize()).should.equal(2)
        })

        it('should call rebase on policy', async () => {
            const fnCalled = MockBaseTokenMonetaryPolicy.interface.decodeEventLog('FunctionCalled', r.events[0].data)
            expect(fnCalled[0]).to.equal('BaseTokenMonetaryPolicy')
            expect(fnCalled[1]).to.equal('rebase')
            expect(fnCalled[2]).to.equal(orchestrator.address)
        })

        it('should call first transaction', async () => {
            const fnCalled = MockDownstream.interface.decodeEventLog('FunctionCalled', r.events[1].data)
            expect(fnCalled[0]).to.equal('MockDownstream')
            expect(fnCalled[1]).to.equal('updateOneArg')
            expect(fnCalled[2]).to.equal(orchestrator.address)

            const fnArgs = MockDownstream.interface.decodeEventLog('FunctionArguments', r.events[2].data)
            const parsedFnArgs = fnArgs.reduce((m, k) => {
                return k.map(d => d.toNumber()).concat(m)
            }, [])
            expect(parsedFnArgs).to.have.lengthOf(1)
            expect(parsedFnArgs[0]).to.equal(12345)
        })

        it('should call second transaction', async () => {
            const fnCalled = MockDownstream.interface.decodeEventLog('FunctionCalled', r.events[3].data)
            expect(fnCalled[0]).to.equal('MockDownstream')
            expect(fnCalled[1]).to.equal('updateTwoArgs')
            expect(fnCalled[2]).to.equal(orchestrator.address)

            const fnArgs = MockDownstream.interface.decodeEventLog('FunctionArguments', r.events[4].data)
            const parsedFnArgs = fnArgs.reduce((m, k) => {
                return k.map(d => d.toNumber()).concat(m)
            }, [])
            expect(parsedFnArgs).to.have.lengthOf(2)
            expect(parsedFnArgs[0]).to.equal(23456)
            expect(parsedFnArgs[1]).to.equal(12345)
        })

        it('should not have any subsequent logs', async () => {
            expect(r.logs.length).to.equal(5)
        })
    })

    describe('when 1st transaction is disabled', async () => {
        before('disabling a transaction', async () => {
            await awaitTx(orchestrator.setTransactionEnabled(0, false))
            r = await awaitTx(orchestrator.rebase())
        })

        it('should have 2 transactions', async () => {
            (await orchestrator.transactionsSize()).should.equal(2)
        })

        it('should call rebase on policy', async () => {
            const fnCalled = MockBaseTokenMonetaryPolicy.interface.decodeEventLog('FunctionCalled', r.events[0].data)
            expect(fnCalled[0]).to.equal('BaseTokenMonetaryPolicy')
            expect(fnCalled[1]).to.equal('rebase')
            expect(fnCalled[2]).to.equal(orchestrator.address)
        })

        it('should call second transaction', async () => {
            const fnCalled = MockDownstream.interface.decodeEventLog('FunctionCalled', r.events[1].data)
            expect(fnCalled[0]).to.equal('MockDownstream')
            expect(fnCalled[1]).to.equal('updateTwoArgs')
            expect(fnCalled[2]).to.equal(orchestrator.address)

            const fnArgs = MockDownstream.interface.decodeEventLog('FunctionArguments', r.events[2].data)
            const parsedFnArgs = fnArgs.reduce((m, k) => {
                return k.map(d => d.toNumber()).concat(m)
            }, [])
            expect(parsedFnArgs).to.have.lengthOf(2)
            expect(parsedFnArgs[0]).to.equal(23456)
            expect(parsedFnArgs[1]).to.equal(12345)
        })

        it('should not have any subsequent logs', async () => {
            expect(r.logs.length).to.equal(3)
        })
    })

    describe('when a transaction is removed', async () => {
        before('removing 1st transaction', async () => {
            orchestrator.removeTransaction(0)
            r = await awaitTx(orchestrator.rebase())
        })

        it('should have 1 transaction', async () => {
            (await orchestrator.transactionsSize()).should.equal(1)
        })

        it('should call rebase on policy', async () => {
            const fnCalled = MockBaseTokenMonetaryPolicy.interface.decodeEventLog('FunctionCalled', r.events[0].data)
            expect(fnCalled[0]).to.equal('BaseTokenMonetaryPolicy')
            expect(fnCalled[1]).to.equal('rebase')
            expect(fnCalled[2]).to.equal(orchestrator.address)
        })

        it('should call the transaction', async () => {
            const fnCalled = MockDownstream.interface.decodeEventLog('FunctionCalled', r.events[1].data)
            expect(fnCalled[0]).to.equal('MockDownstream')
            expect(fnCalled[1]).to.equal('updateTwoArgs')
            expect(fnCalled[2]).to.equal(orchestrator.address)

            const fnArgs = MockDownstream.interface.decodeEventLog('FunctionArguments', r.events[2].data)
            const parsedFnArgs = fnArgs.reduce((m, k) => {
                return k.map(d => d.toNumber()).concat(m)
            }, [])
            expect(parsedFnArgs).to.have.lengthOf(2)
            expect(parsedFnArgs[0]).to.equal(23456)
            expect(parsedFnArgs[1]).to.equal(12345)
        })

        it('should not have any subsequent logs', async () => {
            expect(r.logs.length).to.equal(3)
        })
    })

    describe('when all transactions are removed', async () => {
        before('removing 1st transaction', async () => {
            orchestrator.removeTransaction(0)
            r = await awaitTx(orchestrator.rebase())
        })

        it('should have 0 transactions', async () => {
            (await orchestrator.transactionsSize()).should.equal(0)
        })

        it('should call rebase on policy', async () => {
            const fnCalled = MockBaseTokenMonetaryPolicy.interface.decodeEventLog('FunctionCalled', r.events[0].data)
            expect(fnCalled[0]).to.equal('BaseTokenMonetaryPolicy')
            expect(fnCalled[1]).to.equal('rebase')
            expect(fnCalled[2]).to.equal(orchestrator.address)
        })

        it('should not have any subsequent logs', async () => {
            expect(r.logs.length).to.equal(1)
        })
    })

    describe('when a transaction reverts', async () => {
        before('adding 3 transactions', async () => {
            const updateOneArgEncoded = MockDownstream.interface.encodeFunctionData('updateOneArg', [123])
            await awaitTx(orchestrator.addTransaction(mockDownstream.address, updateOneArgEncoded))

            const revertsEncoded = MockDownstream.interface.encodeFunctionData('reverts', [])
            await awaitTx(orchestrator.addTransaction(mockDownstream.address, revertsEncoded))

            const updateTwoArgsEncoded = MockDownstream.interface.encodeFunctionData('updateTwoArgs', [12345, 23456])
            await awaitTx(orchestrator.addTransaction(mockDownstream.address, updateTwoArgsEncoded))
            await expectRevert.unspecified(orchestrator.rebase())
        })

        it('should have 3 transactions', async () => {
            (await orchestrator.transactionsSize()).should.equal(3)
        })
    })

    describe('Access Control', () => {
        describe('addTransaction', async () => {
            it('should be callable by owner', async () => {
                const updateNoArgEncoded = MockDownstream.interface.encodeFunctionData('updateNoArg', [])
                expect(
                    await isEthException(
                        orchestrator.addTransaction(mockDownstream.address, updateNoArgEncoded)
                    )
                ).to.be.false
            })

            it('should be not be callable by others', async () => {
                const updateNoArgEncoded = MockDownstream.interface.encodeFunctionData('updateNoArg', [])
                expect(
                    await isEthException(
                        orchestrator.connect(user).addTransaction(mockDownstream.address, updateNoArgEncoded)
                    )
                ).to.be.true
            })
        })

        describe('setTransactionEnabled', async () => {
            it('should be callable by owner', async () => {
                ((await orchestrator.transactionsSize()) > 0).should.be.true
                expect(
                    await isEthException(
                        orchestrator.setTransactionEnabled(0, true)
                    )
                ).to.be.false
            })

            it('should be not be callable by others', async () => {
                ((await orchestrator.transactionsSize()) > 0).should.be.true
                expect(
                    await isEthException(
                        orchestrator.connect(user).setTransactionEnabled(0, true)
                    )
                ).to.be.true
            })
        })

        describe('removeTransaction', async () => {
            it('should be not be callable by others', async () => {
                ((await orchestrator.transactionsSize()) > 0).should.be.true
                expect(
                    await isEthException(
                        orchestrator.connect(user).removeTransaction(0)
                    )
                ).to.be.true
            })

            it('should be callable by owner', async () => {
                ((await orchestrator.transactionsSize()) > 0).should.be.true
                expect(
                    await isEthException(
                        orchestrator.removeTransaction(0)
                    )
                ).to.be.false
            })
        })

        describe('transferOwnership', async () => {
            it('should transfer ownership', async () => {
                (await orchestrator.owner()).should.equal(deployerAddr)
                await awaitTx(orchestrator.transferOwnership(userAddr))
                ;(await orchestrator.owner()).should.equal(userAddr)
            })
        })
    })
})
