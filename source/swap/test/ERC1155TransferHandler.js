const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const IERC1155 = require('@openzeppelin/contracts/build/contracts/IERC1155.json')
const { deployMockContract } = waffle
const { ADDRESS_ZERO, tokenKinds } = require('@airswap/constants')

let snapshotId
let transferHandler
let party

describe('ERC721TransferHandler Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy erc1155 transfer handler', async () => {
    ;[deployer, swap, anyone] = await ethers.getSigners()
    token = await deployMockContract(deployer, IERC1155.abi)
    transferHandler = await (
      await ethers.getContractFactory('ERC1155TransferHandler')
    ).deploy()
    await transferHandler.deployed()
    party = {
      wallet: ADDRESS_ZERO,
      token: token.address,
      kind: tokenKinds.ERC1155,
      id: '0',
      amount: '1',
    }
  })

  it('attemptFeeTransfer is true', async () => {
    expect(await transferHandler.attemptFeeTransfer()).to.be.equal(true)
  })

  it('hasAllowance succeeds', async () => {
    await token.mock.isApprovedForAll
      .withArgs(party.wallet, swap.address)
      .returns(true)
    expect(await transferHandler.connect(swap).hasAllowance(party)).to.be.equal(
      true
    )
  })

  it('hasBalance succeeds', async () => {
    await token.mock.balanceOf.returns(party.amount)
    expect(await transferHandler.hasBalance(party)).to.be.equal(true)
  })

  it('transferTokens succeeds', async () => {
    await token.mock.safeTransferFrom.returns()
    await expect(
      transferHandler
        .connect(swap)
        .transferTokens(
          party.wallet,
          anyone.address,
          party.amount,
          party.id,
          party.token
        )
    ).to.not.be.reverted
  })
})
