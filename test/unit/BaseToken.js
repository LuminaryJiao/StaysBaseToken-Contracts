const { ethers, web3, upgrades, expect, BigNumber, isEthException, awaitTx, waitForSomeTime, currentTime, toBASEDenomination, DECIMALS } = require('../setup')

const INTIAL_SUPPLY = toBASEDenomination(50 * 10 ** 6)
const transferAmount = toBASEDenomination(10)
const unitTokenAmount = toBASEDenomination(1)
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

let baseToken, b, r, deployer, deployerAddr, user, userAddr, initialSupply, accounts, provider
async function setupContracts() {
    accounts = await ethers.getSigners()
    ;([ deployer, user ] = accounts)
    deployerAddr = await deployer.getAddress()
    userAddr = await user.getAddress()

    const BaseToken = await ethers.getContractFactory('BaseToken')
    baseToken = await upgrades.deployProxy(BaseToken, [])
    await baseToken.deployed()
    baseToken = baseToken.connect(deployer)
    initialSupply = await baseToken.totalSupply()
}

describe('BaseToken', () => {
    before('setup BaseToken contract', setupContracts);

    it('should reject any ether sent to it', async () => {
        const asdf = await isEthException(user.sendTransaction({ to: baseToken.address, value: 1 }));
        expect(
            asdf
        ).to.be.true;
    });
});

describe('BaseToken:Initialization', () => {
    before('setup BaseToken contract', setupContracts)

    it('should transfer 50M BASE to the deployer', async () => {
        (await baseToken.balanceOf(deployerAddr)).should.equal(INTIAL_SUPPLY)
    })

    it('should set the totalSupply to 50M', async () => {
        initialSupply.should.equal(INTIAL_SUPPLY)
    })

    it('should set the owner', async () => {
        expect(await baseToken.owner()).to.equal(deployerAddr)
    })

    it('should set detailed ERC20 parameters', async () => {
        expect(await baseToken.name()).to.equal('Base Protocol')
        expect(await baseToken.symbol()).to.equal('BASE')
        expect(await baseToken.decimals()).to.equal(DECIMALS)
    })

    it('should have 9 decimals', async () => {
        const decimals = await baseToken.decimals()
        expect(decimals).to.equal(DECIMALS)
    })

    it('should have BASE symbol', async () => {
        const symbol = await baseToken.symbol()
        expect(symbol).to.equal('BASE')
    })
})

describe('BaseToken:setMonetaryPolicy', () => {
    before('setup BaseToken contract', setupContracts)

    it('should set reference to policy contract', async () => {
        const policy = accounts[1]
        const policyAddr = await policy.getAddress()
        await baseToken.setMonetaryPolicy(policyAddr)
        expect(await baseToken.monetaryPolicy()).to.equal(policyAddr)
    })

    it('should emit policy updated event', async () => {
        const policy = accounts[1]
        const policyAddr = await policy.getAddress()
        const r = await awaitTx(baseToken.setMonetaryPolicy(policyAddr))
        const log = r.events[0]
        expect(log).to.exist
        expect(log.event).to.equal('LogMonetaryPolicyUpdated')
        expect(log.args.monetaryPolicy).to.equal(policyAddr)
    })
})

describe('BaseToken:setMonetaryPolicy:accessControl', () => {
    before('setup BaseToken contract', setupContracts)

    it('should be callable by owner', async () => {
        const policy = accounts[1]
        const policyAddr = await policy.getAddress()
        expect(
            await isEthException(baseToken.setMonetaryPolicy(policyAddr))
        ).to.be.false
    })
})

describe('BaseToken:setMonetaryPolicy:accessControl', () => {
    before('setup BaseToken contract', setupContracts)

    it('should NOT be callable by non-owner', async () => {
        const policy = accounts[1]
        const user = accounts[2]
        const policyAddr = await policy.getAddress()
        expect(
            await isEthException(baseToken.connect(user).setMonetaryPolicy(policyAddr))
        ).to.be.true
    })
})

describe('BaseToken:Rebase:accessControl', () => {
    before('setup BaseToken contract', async () => {
        await setupContracts()
        await baseToken.setMonetaryPolicy(userAddr)
    })

    it('should be callable by monetary policy', async () => {
        expect(
            await isEthException(baseToken.connect(user).rebase(1, transferAmount))
        ).to.be.false
    })

    it('should not be callable by others', async () => {
        expect(
            await isEthException(baseToken.rebase(1, transferAmount))
        ).to.be.true
    })
})

describe('BaseToken:Rebase:Expansion', () => {
    // Rebase +5M (10%), with starting balances A:750 and B:250.
    let A, B, policy
    const rebaseAmt = INTIAL_SUPPLY / 10

    before('setup BaseToken contract', async () => {
        await setupContracts()
        A = accounts[2]
        B = accounts[3]
        policy = accounts[1]
        const policyAddr = await policy.getAddress()
        await awaitTx(baseToken.setMonetaryPolicy(policyAddr))
        await awaitTx(baseToken.transfer(await A.getAddress(), toBASEDenomination(750)))
        await awaitTx(baseToken.transfer(await B.getAddress(), toBASEDenomination(250)))
        r = await awaitTx(baseToken.connect(policy).rebase(1, rebaseAmt))
    })

    it('should increase the totalSupply', async () => {
        b = await baseToken.totalSupply()
        expect(b).to.equal(initialSupply.add(rebaseAmt))
    })

    it('should increase individual balances', async () => {
        b = await baseToken.balanceOf(await A.getAddress())
        expect(b).to.equal(toBASEDenomination(825))

        b = await baseToken.balanceOf(await B.getAddress())
        expect(b).to.equal(toBASEDenomination(275))
    })

    it('should emit Rebase', async () => {
        const log = r.events[0]
        expect(log).to.exist
        expect(log.event).to.equal('LogRebase')
        expect(log.args.epoch).to.equal(1)
        expect(log.args.totalSupply).to.equal(initialSupply.add(rebaseAmt))
    })
})

describe('BaseToken:Rebase:Expansion', () => {
    const MAX_SUPPLY = BigNumber.from(2).pow(128).sub(1)
    let policy

    describe('when totalSupply is less than MAX_SUPPLY and expands beyond', () => {
        before('setup BaseToken contract', async () => {
            await setupContracts()
            policy = accounts[1]
            const policyAddr = await policy.getAddress()
            await awaitTx(baseToken.setMonetaryPolicy(policyAddr))
            const totalSupply = await baseToken.totalSupply()
            await awaitTx(baseToken.connect(policy).rebase(1, MAX_SUPPLY.sub(totalSupply).sub(toBASEDenomination(1))))
            r = await awaitTx(baseToken.connect(policy).rebase(2, toBASEDenomination(2)))
        })

        it('should increase the totalSupply to MAX_SUPPLY', async () => {
            b = await baseToken.totalSupply()
            expect(b).to.equal(MAX_SUPPLY)
        })

        it('should emit Rebase', async () => {
            const log = r.events[0]
            expect(log).to.exist
            expect(log.event).to.equal('LogRebase')
            expect(log.args.epoch.toNumber()).to.equal(2)
            expect(log.args.totalSupply).to.equal(MAX_SUPPLY)
        })
    })

    describe('when totalSupply is MAX_SUPPLY and expands', () => {
        before(async () => {
            b = await baseToken.totalSupply()
            expect(b).to.equal(MAX_SUPPLY)
            r = await awaitTx(baseToken.connect(policy).rebase(3, toBASEDenomination(2)))
        })

        it('should NOT change the totalSupply', async () => {
            b = await baseToken.totalSupply()
            expect(b).to.equal(MAX_SUPPLY)
        })

        it('should emit Rebase', async () => {
            const log = r.events[0]
            expect(log).to.exist
            expect(log.event).to.equal('LogRebase')
            expect(log.args.epoch.toNumber()).to.equal(3)
            expect(log.args.totalSupply).to.equal(MAX_SUPPLY)
        })
    })
})

describe('BaseToken:Rebase:NoChange', () => {
    // Rebase (0%), with starting balances A:750 and B:250.
    let A, B, policy

    before('setup BaseToken contract', async () => {
        await setupContracts()
        A = accounts[2]
        B = accounts[3]
        policy = accounts[1]
        const policyAddr = await policy.getAddress()
        await awaitTx(baseToken.setMonetaryPolicy(policyAddr))
        await awaitTx(baseToken.transfer(await A.getAddress(), toBASEDenomination(750)))
        await awaitTx(baseToken.transfer(await B.getAddress(), toBASEDenomination(250)))
        r = await awaitTx(baseToken.connect(policy).rebase(1, 0))
    })

    it('should NOT CHANGE the totalSupply', async () => {
        b = await baseToken.totalSupply()
        expect(b).to.equal(initialSupply)
    })

    it('should NOT CHANGE individual balances', async () => {
        b = await baseToken.balanceOf(await A.getAddress())
        expect(b).to.equal(toBASEDenomination(750))

        b = await baseToken.balanceOf(await B.getAddress())
        expect(b).to.equal(toBASEDenomination(250))
    })

    it('should emit Rebase', async () => {
        const log = r.events[0]
        expect(log).to.exist
        expect(log.event).to.equal('LogRebase')
        expect(log.args.epoch).to.equal(1)
        expect(log.args.totalSupply).to.equal(initialSupply)
    })
})

describe('BaseToken:Rebase:Contraction', () => {
    // Rebase -5M (-10%), with starting balances A:750 and B:250.
    const rebaseAmt = INTIAL_SUPPLY / 10
    let A, B, policy

    before('setup BaseToken contract', async () => {
        await setupContracts()
        A = accounts[2]
        B = accounts[3]
        policy = accounts[1]
        const policyAddr = await policy.getAddress()
        await awaitTx(baseToken.setMonetaryPolicy(policyAddr))
        await awaitTx(baseToken.transfer(await A.getAddress(), toBASEDenomination(750)))
        await awaitTx(baseToken.transfer(await B.getAddress(), toBASEDenomination(250)))
        r = await awaitTx(baseToken.connect(policy).rebase(1, -rebaseAmt))
    })

    it('should decrease the totalSupply', async () => {
        b = await baseToken.totalSupply()
        expect(b).to.equal(initialSupply.sub(rebaseAmt))
    })

    it('should decrease individual balances', async () => {
        b = await baseToken.balanceOf(await A.getAddress())
        expect(b).to.equal(toBASEDenomination(675))

        b = await baseToken.balanceOf(await B.getAddress())
        expect(b).to.equal(toBASEDenomination(225))
    })

    it('should emit Rebase', async () => {
        const log = r.events[0]
        expect(log).to.exist
        expect(log.event).to.equal('LogRebase')
        expect(log.args.epoch).to.equal(1)
        expect(log.args.totalSupply).to.equal(initialSupply.sub(rebaseAmt))
    })
})

describe('BaseToken:Transfer', () => {
    let A, B, C

    before('setup BaseToken contract', async () => {
        await setupContracts()
        A = accounts[2]
        B = accounts[3]
        C = accounts[4]
    })

    describe('deployer transfers 12 to A', () => {
        it('should have correct balances', async () => {
            const deployerBefore = await baseToken.balanceOf(await deployer.getAddress())
            await awaitTx(baseToken.transfer(await A.getAddress(), toBASEDenomination(12)))
            b = await baseToken.balanceOf(await deployer.getAddress())
            expect(b).to.equal(deployerBefore.sub(toBASEDenomination(12)))
            b = await baseToken.balanceOf(await A.getAddress())
            expect(b).to.equal(toBASEDenomination(12))
        })
    })

    describe('deployer transfers 15 to B', async () => {
        it('should have balances [973,15]', async () => {
            const deployerBefore = await baseToken.balanceOf(await deployer.getAddress())
            await awaitTx(baseToken.transfer(await B.getAddress(), toBASEDenomination(15)))
            b = await baseToken.balanceOf(await deployer.getAddress())
            expect(b).to.equal(deployerBefore.sub(toBASEDenomination(15)))
            b = await baseToken.balanceOf(await B.getAddress())
            expect(b).to.equal(toBASEDenomination(15))
        })
    })

    describe('deployer transfers the rest to C', async () => {
        it('should have balances [0,973]', async () => {
            const deployerBefore = await baseToken.balanceOf(await deployer.getAddress())
            await awaitTx(baseToken.transfer(await C.getAddress(), deployerBefore))
            b = await baseToken.balanceOf(await deployer.getAddress())
            expect(b).to.equal(0)
            b = await baseToken.balanceOf(await C.getAddress())
            expect(b).to.equal(deployerBefore)
        })
    })

    describe('when the recipient address is the contract address', async () => {
        it('reverts on transfer', async () => {
            const owner = A
            expect(
                await isEthException(baseToken.connect(owner).transfer(baseToken.address, unitTokenAmount))
            ).to.be.true
        })

        it('reverts on transferFrom', async () => {
            const owner = A
            expect(
                await isEthException(baseToken.connect(owner).transferFrom(await owner.getAddress(), baseToken.address, unitTokenAmount))
            ).to.be.true
        })
    })

    describe('when the recipient is the zero address', () => {
        before(async () => {
            const owner = A
            r = await awaitTx(baseToken.connect(owner).approve(ZERO_ADDRESS, transferAmount))
        })

        it('emits an approval event', async () => {
            const owner = A
            expect(r.events.length).to.equal(1)
            expect(r.events[0].event).to.equal('Approval')
            expect(r.events[0].args.owner).to.equal(await owner.getAddress())
            expect(r.events[0].args.spender).to.equal(ZERO_ADDRESS)
            expect(r.events[0].args.value).to.equal(transferAmount)
        })

        it('transferFrom should fail', async () => {
            const owner = A
            expect(
                await isEthException(baseToken.connect(C).transferFrom(await owner.getAddress(), ZERO_ADDRESS, transferAmount))
            ).to.be.true
        })
    })
})
