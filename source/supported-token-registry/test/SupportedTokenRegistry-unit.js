const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')

describe('SupportedTokenRegistry Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let token1
  let token2
  let token3
  let stakingToken
  let registryFactory
  let registry
  const OBLIGATION_COST = 1000
  const TOKEN_COST = 10

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before(async () => {
    ;[
      deployer,
      account1,
      account2,
      token1,
      token2,
      token3,
    ] = await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    registryFactory = await ethers.getContractFactory('SupportedTokenRegistry')
    registry = await registryFactory.deploy(
      stakingToken.address,
      OBLIGATION_COST,
      TOKEN_COST
    )
    await registry.deployed()
  })

  describe('Default Values', async () => {
    it('constructor set default values', async () => {
      const owner = await registry.owner()
      const tokenAddress = await registry.stakingToken()
      const obligationCost = await registry.obligationCost()
      const tokenCost = await registry.tokenCost()
      expect(owner).to.equal(deployer.address)
      expect(tokenAddress).to.equal(stakingToken.address)
      expect(obligationCost).to.equal(OBLIGATION_COST)
      expect(tokenCost).to.equal(TOKEN_COST)
    })
  })

  describe('Add Tokens', async () => {
    it('add a list of tokens when there is sufficient stake token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])
      const tokens = await registry.getSupportedTokens(account1.address)
      expect(tokens.length).to.equal(3)
      expect(tokens[0]).to.equal(token1.address)
      expect(tokens[1]).to.equal(token2.address)
      expect(tokens[2]).to.equal(token3.address)

      //TODO: test supporting stakers for tokens
    })

    it('add a lsit of tokens when there is insufficent stake token', async () => {
      await stakingToken.mock.transferFrom.revertsWithReason(
        'Insufficient Funds'
      )
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token3.address])
      ).to.be.revertedWith('Insufficient Funds')
    })

    // TODO: add duplicates and show that the total number of tokens hasn't increased
  })

  describe('Remove Tokens', async () => {
    it('remove a list of tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await registry
        .connect(account1)
        .removeTokens([token1.address, token2.address, token3.address])

      const tokens = await registry.getSupportedTokens(account1.address)
      expect(tokens.length).to.equal(0)

      //TODO: test supporting stakers for tokens
    })

    it('remove all tokens for an staker', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])
      await registry.connect(account1).removeAllTokens()
      const tokens = await registry.getSupportedTokens(account1.address)
      expect(tokens.length).to.equal(0)

      //TODO test supporting stakers for tokens
    })
  })

  describe('Set Locator', async () => {
    it('successful setting of locator', async () => {
      await registry
        .connect(account1)
        .setLocator(ethers.utils.formatBytes32String('www.noneLocator.com'))

      const locator = await registry.locator(account1.address)
      expect(ethers.utils.parseBytes32String(locator)).to.equal(
        'www.noneLocator.com'
      )
    })

    it('successful changing of locator', async () => {
      await registry
        .connect(account1)
        .setLocator(ethers.utils.formatBytes32String('www.noneLocator.com'))
      await registry
        .connect(account1)
        .setLocator(ethers.utils.formatBytes32String('www.TheCatsMeow.com'))

      const locator = await registry.locator(account1.address)
      expect(ethers.utils.parseBytes32String(locator)).to.equal(
        'www.TheCatsMeow.com'
      )
    })
  })
})
