const { ethers, web3, upgrades, expect, BigNumber, isEthException, awaitTx, waitForSomeTime, currentTime, toBASEDenomination } = require('../setup')

describe('UInt256Lib', () => {
    const MAX_INT256 = BigNumber.from(2).pow(255).sub(1)

    let UInt256Lib

    beforeEach(async () => {
        const UInt256LibMock = await ethers.getContractFactory('UInt256LibMock')
        UInt256Lib = await UInt256LibMock.deploy()
    })

    async function returnVal (tx) {
        return (await awaitTx(tx)).events[0].args.val
    }

    describe('toInt256Safe', () => {
        describe('when then number is more than MAX_INT256', () => {
            it('should fail', async () => {
                expect(
                    await isEthException(UInt256Lib.toInt256Safe(MAX_INT256.add(1)))
                ).to.be.true
            })
        })

        describe('when then number is MAX_INT256', () => {
            it('converts int to uint256 safely', async () => {
                (await returnVal(UInt256Lib.toInt256Safe(MAX_INT256))).should.equal(MAX_INT256)
            })
        })

        describe('when then number is less than MAX_INT256', () => {
            it('converts int to uint256 safely', async () => {
                (await returnVal(UInt256Lib.toInt256Safe(MAX_INT256.sub(1)))).should.equal(MAX_INT256.sub(1))
            })
        })

        describe('when then number is 0', () => {
            it('converts int to uint256 safely', async () => {
                (await returnVal(UInt256Lib.toInt256Safe(0))).should.equal(0)
            })
        })
    })
})
