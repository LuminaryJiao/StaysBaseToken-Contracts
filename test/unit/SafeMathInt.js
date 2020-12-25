const { ethers, web3, upgrades, expect, BigNumber, isEthException, awaitTx, waitForSomeTime, currentTime, toBASEDenomination } = require('../setup')

describe('SafeMathInt', () => {
    const MIN_INT256 = BigNumber.from(-2).pow(255)
    const MAX_INT256 = BigNumber.from(2).pow(255).sub(1)

    let safeMathInt

    beforeEach(async () => {
        const SafeMathIntMock = await ethers.getContractFactory('SafeMathIntMock')
        safeMathInt = await SafeMathIntMock.deploy()
    })

    async function returnVal (tx) {
        return (await awaitTx(tx)).events[0].args.val
    }

    describe('add', () => {
        it('adds correctly', async () => {
            const a = BigNumber.from(5678)
            const b = BigNumber.from(1234)

            ;(await returnVal(safeMathInt.add(a, b))).should.equal(a.add(b))
        })

        it('should fail on addition overflow', async () => {
            const a = MAX_INT256
            const b = BigNumber.from(1)

            expect(
                await isEthException(safeMathInt.add(a, b))
            ).to.be.true
            expect(
                await isEthException(safeMathInt.add(b, a))
            ).to.be.true
        })

        it('should fail on addition overflow, swapped args', async () => {
            const a = BigNumber.from(1)
            const b = MAX_INT256

            expect(
                await isEthException(safeMathInt.add(a, b))
            ).to.be.true
            expect(
                await isEthException(safeMathInt.add(b, a))
            ).to.be.true
        })

        it('should fail on addition negative overflow', async () => {
            const a = MIN_INT256
            const b = BigNumber.from(-1)

            expect(
                await isEthException(safeMathInt.add(a, b))
            ).to.be.true
            expect(
                await isEthException(safeMathInt.add(b, a))
            ).to.be.true
        })
    })

    describe('sub', () => {
        it('subtracts correctly', async () => {
            const a = BigNumber.from(5678)
            const b = BigNumber.from(1234)

            ;(await returnVal(safeMathInt.sub(a, b))).should.equal(a.sub(b))
        })

        it('should fail on subtraction overflow', async () => {
            const a = MAX_INT256
            const b = BigNumber.from(-1)

            expect(
                await isEthException(safeMathInt.sub(a, b))
            ).to.be.true
        })

        it('should fail on subtraction negative overflow', async () => {
            const a = MIN_INT256
            const b = BigNumber.from(1)

            expect(
                await isEthException(safeMathInt.sub(a, b))
            ).to.be.true
        })
    })

    describe('mul', () => {
        it('multiplies correctly', async () => {
            const a = BigNumber.from(1234)
            const b = BigNumber.from(5678)

            ;(await returnVal(safeMathInt.mul(a, b))).should.equal(a.mul(b))
        })

        it('handles a zero product correctly', async () => {
            const a = BigNumber.from(0)
            const b = BigNumber.from(5678)

            ;(await returnVal(safeMathInt.mul(a, b))).should.equal(a.mul(b))
        })

        it('should fail on multiplication overflow', async () => {
            const a = MAX_INT256
            const b = BigNumber.from(2)

            expect(
                await isEthException(safeMathInt.mul(a, b))
            ).to.be.true
            expect(
                await isEthException(safeMathInt.mul(b, a))
            ).to.be.true
        })

        it('should fail on multiplication negative overflow', async () => {
            const a = MIN_INT256
            const b = BigNumber.from(2)

            expect(
                await isEthException(safeMathInt.mul(a, b))
            ).to.be.true
            expect(
                await isEthException(safeMathInt.mul(b, a))
            ).to.be.true
        })

        it('should fail on multiplication between -1 and MIN_INT256', async () => {
            const a = MIN_INT256
            const b = BigNumber.from(-1)

            expect(
                await isEthException(safeMathInt.mul(a, b))
            ).to.be.true
            expect(
                await isEthException(safeMathInt.mul(b, a))
            ).to.be.true
        })
    })

    describe('div', () => {
        it('divides correctly', async () => {
            const a = BigNumber.from(5678)
            const b = BigNumber.from(5678)

            ;(await returnVal(safeMathInt.div(a, b))).should.equal(a.div(b))
        })

        it('should fail on zero division', async () => {
            const a = BigNumber.from(5678)
            const b = BigNumber.from(0)

            expect(
                await isEthException(safeMathInt.div(a, b))
            ).to.be.true
        })

        it('should fail when MIN_INT256 is divided by -1', async () => {
            const a = BigNumber.from(MIN_INT256)
            const b = BigNumber.from(-1)

            expect(
                await isEthException(safeMathInt.div(a, b))
            ).to.be.true
        })
    })

    describe('abs', () => {
        it('works for 0', async () => {
            (await returnVal(safeMathInt.abs(0))).should.equal(0)
        })

        it('works on positive numbers', async () => {
            (await returnVal(safeMathInt.abs(100))).should.equal(100)
        })

        it('works on negative numbers', async () => {
            (await returnVal(safeMathInt.abs(-100))).should.equal(100)
        })

        it('fails on overflow condition', async () => {
            expect(
                await isEthException(safeMathInt.abs(MIN_INT256))
            ).to.be.true
        })
    })
})
