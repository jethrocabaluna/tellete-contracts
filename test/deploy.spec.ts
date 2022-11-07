import { assert, expect } from 'chai'
import { ContractTransaction } from 'ethers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { MessageRelay } from '../typechain-types'

describe('MessageRelay', async () => {
  const usernameSender1 = 's3nder_1'
  const publicKeySender1 = 'public_key_s3nder_1'
  const addressSender1 = '0x71bE63f3384f5fb98995898A86B02Fb2426c5788'
  const usernameSender2 = 'sEnder_2'
  const publicKeySender2 = 'public_key_sEnder_2'
  const addressSender2 = '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a'
  const usernameReceiver1 = 'r3ceiver_1'
  const publicKeyReceiver1 = 'public_key_r3ceiver_1'
  const addressReceiver1 = '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec'
  const usernameReceiver2 = 'rEceiver_2'
  const publicKeyReceiver2 = 'public_key_rEceiver_2'
  const addressReceiver2 = '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097'

  let deployer: string
  let contract: MessageRelay

  beforeEach(async () => {
    const namedAccounts = await getNamedAccounts()
    deployer = namedAccounts.deployer

    await deployments.fixture('all')

    contract = await ethers.getContract('MessageRelay', deployer)
  })

  describe('Public key', () => {
    it('reverts if public key does not exist for the username provided', async () => {
      await expect(contract.getPublicKey(usernameSender1)).to.be.revertedWithCustomError(
        contract,
        'MessageRelay__NoPublicKey'
      )
    })

    it('allows getting anyones public key by anyone', async () => {
      // creating the users
      // response = await contract.addUser(addressSender1, usernameSender1, publicKeySender1)
      // await response.wait()
      await expect(contract.addUser(addressSender1, usernameSender1, publicKeySender1))
        .to.emit(contract, 'UserAdded')
        .withArgs(addressSender1)
      await expect(contract.addUser(addressReceiver1, usernameReceiver1, publicKeyReceiver1))
        .to.emit(contract, 'UserAdded')
        .withArgs(addressReceiver1)

      // sender can get receiver's public key
      const receiverPublicKey = await contract.getPublicKey(usernameReceiver1)
      assert.equal(receiverPublicKey, publicKeyReceiver1)

      // receiver can get sender's public key
      const senderPublicKey = await contract.getPublicKey(usernameSender1)
      assert.equal(senderPublicKey, publicKeySender1)
    })

    it('changes current public key', async () => {
      const newPublicKey = 'new_public_key'

      await expect(contract.addUser(addressSender1, usernameSender1, publicKeySender1))
        .to.emit(contract, 'UserAdded')
        .withArgs(addressSender1)

      let currentPublicKey = await contract.getPublicKey(usernameSender1)
      assert.equal(currentPublicKey, publicKeySender1)

      await expect(contract.changeUserPublicKey(addressSender1, newPublicKey))
        .to.emit(contract, 'PublicKeyUpdated')
        .withArgs(addressSender1)

      currentPublicKey = await contract.getPublicKey(usernameSender1)
      assert.equal(currentPublicKey, newPublicKey)
    })
  })

  describe('Messaging', () => {
    it('sends a message and delete the message upon receiving', async () => {
      const sentMessage = 'hello world hey'
      let response: ContractTransaction

      // creating the users
      await expect(contract.addUser(addressSender1, usernameSender1, publicKeySender1))
        .to.emit(contract, 'UserAdded')
        .withArgs(addressSender1)
      await expect(contract.addUser(addressReceiver1, usernameReceiver1, publicKeyReceiver1))
        .to.emit(contract, 'UserAdded')
        .withArgs(addressReceiver1)

      // check if receiver has a message from the sender
      let hasMessageFromSender = await contract.hasMessageFrom(addressReceiver1, usernameSender1)
      assert.equal(hasMessageFromSender, false)
      let hasMessageToReceiver = await contract.hasMessageTo(addressSender1, usernameReceiver1)
      assert.equal(hasMessageToReceiver, false)

      // sending and receiving a message
      await expect(contract.sendMessage(addressSender1, usernameReceiver1, sentMessage))
        .to.emit(contract, 'MessageSent')
        .withArgs(addressSender1, usernameReceiver1)
      hasMessageFromSender = await contract.hasMessageFrom(addressReceiver1, usernameSender1)
      assert.equal(hasMessageFromSender, true)
      hasMessageToReceiver = await contract.hasMessageTo(addressSender1, usernameReceiver1)
      assert.equal(hasMessageToReceiver, true)
      const receivedMessage = await contract.getMessage(addressReceiver1, usernameSender1)
      assert.equal(receivedMessage.content, sentMessage)

      // message is deleted in state when receiver received the message
      await expect(contract.deleteMessageFrom(addressReceiver1, usernameSender1))
        .to.emit(contract, 'MessageDeleted')
        .withArgs(usernameSender1, addressReceiver1)
      await expect(contract.getMessage(addressReceiver1, usernameSender1)).to.be.revertedWithCustomError(
        contract,
        'MessageRelay__NoMessage'
      )
      await expect(contract.deleteMessageFrom(addressReceiver1, usernameSender1)).to.be.revertedWithCustomError(
        contract,
        'MessageRelay__NoMessage'
      )

      hasMessageFromSender = await contract.hasMessageFrom(addressReceiver1, usernameSender1)
      assert.equal(hasMessageFromSender, false)
      hasMessageToReceiver = await contract.hasMessageTo(addressSender1, usernameReceiver1)
      assert.equal(hasMessageToReceiver, false)
    })
  })

  describe('Validations', () => {
    describe('Registration', () => {
      it('reverts if username is too short', async () => {
        await expect(contract.addUser(addressSender1, 'inv', 'publicKey')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__InvalidUsername'
        )
      })
      it('reverts if username is too long', async () => {
        const longUsername =
          'veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery_long_username'
        await expect(contract.addUser(addressSender1, longUsername, 'publicKey')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__InvalidUsername'
        )
      })
      it('reverts if username consists of invalid characters', async () => {
        await expect(contract.addUser(addressSender1, '@lphanumeric0nly', 'publicKey')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__InvalidUsername'
        )
        await expect(contract.addUser(addressSender1, 'user name', 'publicKey')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__InvalidUsername'
        )
        await expect(contract.addUser(addressSender1, '____', 'publicKey')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__InvalidUsername'
        )
      })
      it('reverts if user tries to create multiple account', async () => {
        const response = await contract.addUser(addressSender1, usernameSender1, publicKeySender1)
        await response.wait()

        await expect(contract.addUser(addressSender1, usernameSender2, publicKeySender2)).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__AddressAlreadyRegistered'
        )
      })
      it('reverts if username is already taken', async () => {
        await expect(contract.addUser(addressSender1, usernameSender1, publicKeySender1))
          .to.emit(contract, 'UserAdded')
          .withArgs(addressSender1)

        // username is already taken
        await expect(
          contract.addUser(addressReceiver1, usernameSender1, publicKeySender1)
        ).to.be.revertedWithCustomError(contract, 'MessageRelay__UsernameAlreadyExists')
      })
      it('reverts if username not found for the sender', async () => {
        await expect(contract.getUsername(addressSender1)).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__NoUser'
        )
      })
      it('returns username of the sender', async () => {
        await expect(contract.addUser(addressSender1, usernameSender1, publicKeySender1))
          .to.emit(contract, 'UserAdded')
          .withArgs(addressSender1)

        const username = await contract.getUsername(addressSender1)
        assert.equal(username, usernameSender1)
      })
    })

    describe('Messaging', () => {
      beforeEach(async () => {
        await expect(contract.addUser(addressSender1, usernameSender1, publicKeySender1))
          .to.emit(contract, 'UserAdded')
          .withArgs(addressSender1)
        await expect(contract.addUser(addressReceiver1, usernameReceiver1, publicKeyReceiver1))
          .to.emit(contract, 'UserAdded')
          .withArgs(addressReceiver1)
      })

      it('reverts if message is empty', async () => {
        await expect(contract.sendMessage(addressSender1, usernameReceiver1, '')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__InvalidMessage'
        )
      })
      it('reverts if message is too long', async () => {
        const longMessage = `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque blandit scelerisque placerat. Nulla mollis urna lorem, ac congue justo hendrerit eu. Integer pretium varius nisi, sed tincidunt nisl eleifend eget. Suspendisse eu eros vel velit facilisis cursus. Nullam leo mi, tempus sed mauris sit amet, pharetra pellentesque nisi. Curabitur rhoncus nisi quis lectus facilisis ultricies. Suspendisse potenti. Nam lacus magna, euismod ac blandit eu, dictum quis mauris. Praesent vulputate leo libero, sit amet porttitor dolor dictum id. Sed vehicula libero urna, vitae molestie felis efficitur et. In in leo eros.

        Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam volutpat lobortis ex sed scelerisque. Phasellus pellentesque nisl magna, at cursus nulla dignissim in. Quisque eu blandit lectus. Maecenas pulvinar, ante nec consectetur ornare, neque libero lobortis purus, in interdum tellus mi non lacus. Aenean suscipit libero ut posuere fermentum. Aenean et sodales nulla. Praesent eu faucibus sapien proin.
        `
        await expect(
          contract.sendMessage(addressSender1, usernameReceiver1, longMessage)
        ).to.be.revertedWithCustomError(contract, 'MessageRelay__InvalidMessage')
      })
      it('reverts if receiver does not exist', async () => {
        await expect(contract.sendMessage(addressSender1, usernameReceiver2, 'u there?')).to.be.revertedWithCustomError(
          contract,
          'MessageRelay__NoUser'
        )
      })
    })
  })
})
