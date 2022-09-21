import { assert, expect } from 'chai'
import { ContractTransaction } from 'ethers'
import { deployments, ethers, getNamedAccounts } from 'hardhat'
import { MessageRelay } from '../typechain-types'

describe('MessageRelay', async () => {
  const usernameSender1 = 's3nder_1'
  const publicKeySender1 = 'public_key_s3nder_1'
  const usernameSender2 = 'sEnder_2'
  const publicKeySender2 = 'public_key_sEnder_2'
  const usernameReceiver1 = 'r3ceiver_1'
  const publicKeyReceiver1 = 'public_key_r3ceiver_1'
  const usernameReceiver2 = 'rEceiver_2'
  const publicKeyReceiver2 = 'public_key_rEceiver_2'

  let deployer: string
  let sender1: string
  let sender2: string
  let receiver1: string
  let receiver2: string

  let messageRelayContractFromSender1: MessageRelay
  let messageRelayContractFromSender2: MessageRelay
  let messageRelayContractFromReceiver1: MessageRelay
  let messageRelayContractFromReceiver2: MessageRelay

  beforeEach(async () => {
    const namedAccounts = await getNamedAccounts()
    deployer = namedAccounts.deployer
    sender1 = namedAccounts.sender1
    sender2 = namedAccounts.sender2
    receiver1 = namedAccounts.receiver1
    receiver2 = namedAccounts.receiver2

    await deployments.fixture('all')

    messageRelayContractFromSender1 = await ethers.getContract('MessageRelay', sender1)
    messageRelayContractFromSender2 = await ethers.getContract('MessageRelay', sender2)
    messageRelayContractFromReceiver1 = await ethers.getContract('MessageRelay', receiver1)
    messageRelayContractFromReceiver2 = await ethers.getContract('MessageRelay', receiver2)
  })

  describe('Public key', () => {
    it('reverts if public key does not exist for the username provided', async () => {
      await expect(messageRelayContractFromSender1.getPublicKey(usernameSender1)).to.be.revertedWithCustomError(
        messageRelayContractFromSender1,
        'MessageRelay__NoPublicKey'
      )
    })

    it('allows getting anyones public key by anyone', async () => {
      let response: ContractTransaction

      // creating the users
      response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
      await response.wait()
      response = await messageRelayContractFromReceiver1.addUser(usernameReceiver1, publicKeyReceiver1)
      await response.wait()

      // sender can get receiver's public key
      const receiverPublicKey = await messageRelayContractFromSender1.getPublicKey(usernameReceiver1)
      assert.equal(receiverPublicKey, publicKeyReceiver1)

      // receiver can get sender's public key
      const senderPublicKey = await messageRelayContractFromReceiver1.getPublicKey(usernameSender1)
      assert.equal(senderPublicKey, publicKeySender1)
    })

    it('changes current public key', async () => {
      let response: ContractTransaction
      const newPublicKey = 'new_public_key'

      response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
      await response.wait()

      let currentPublicKey = await messageRelayContractFromSender1.getPublicKey(usernameSender1)
      assert.equal(currentPublicKey, publicKeySender1)

      response = await messageRelayContractFromSender1.changeUserPublicKey(newPublicKey)
      await response.wait()

      currentPublicKey = await messageRelayContractFromSender1.getPublicKey(usernameSender1)
      assert.equal(currentPublicKey, newPublicKey)
    })
  })

  describe('Messaging', () => {
    it('sends a message and delete the message upon receiving', async () => {
      const sentMessage = 'hello world hey'
      let response: ContractTransaction

      // creating the users
      response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
      await response.wait()
      response = await messageRelayContractFromReceiver1.addUser(usernameReceiver1, publicKeyReceiver1)
      await response.wait()

      // check if receiver has a message from the sender
      let hasMessageFromSender = await messageRelayContractFromReceiver1.hasMessageFrom(usernameSender1)
      assert.equal(hasMessageFromSender, false)
      let hasMessageToReceiver = await messageRelayContractFromSender1.hasMessageTo(usernameReceiver1)
      assert.equal(hasMessageToReceiver, false)

      // sending and receiving a message
      response = await messageRelayContractFromSender1.sendMessage(usernameReceiver1, sentMessage)
      await response.wait()
      hasMessageFromSender = await messageRelayContractFromReceiver1.hasMessageFrom(usernameSender1)
      assert.equal(hasMessageFromSender, true)
      hasMessageToReceiver = await messageRelayContractFromSender1.hasMessageTo(usernameReceiver1)
      assert.equal(hasMessageToReceiver, true)
      const receivedMessage = await messageRelayContractFromReceiver1.getMessage(usernameSender1)
      assert.equal(receivedMessage.content, sentMessage)

      // message is deleted in state when receiver received the message
      response = await messageRelayContractFromReceiver1.deleteMessageFrom(usernameSender1)
      await response.wait()
      await expect(messageRelayContractFromReceiver1.getMessage(usernameSender1)).to.be.revertedWithCustomError(
        messageRelayContractFromReceiver1,
        'MessageRelay__NoMessage'
      )
      await expect(messageRelayContractFromReceiver1.deleteMessageFrom(usernameSender1)).to.be.revertedWithCustomError(
        messageRelayContractFromReceiver1,
        'MessageRelay__NoMessage'
      )

      hasMessageFromSender = await messageRelayContractFromReceiver1.hasMessageFrom(usernameSender1)
      assert.equal(hasMessageFromSender, false)
      hasMessageToReceiver = await messageRelayContractFromSender1.hasMessageTo(usernameReceiver1)
      assert.equal(hasMessageToReceiver, false)
    })
  })

  describe('Validations', () => {
    describe('Registration', () => {
      it('reverts if username is too short', async () => {
        await expect(messageRelayContractFromSender1.addUser('inv', 'publicKey')).to.be.revertedWithCustomError(
          messageRelayContractFromSender1,
          'MessageRelay__InvalidUsername'
        )
      })
      it('reverts if username is too long', async () => {
        const longUsername =
          'veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery_long_username'
        await expect(messageRelayContractFromSender1.addUser(longUsername, 'publicKey')).to.be.revertedWithCustomError(
          messageRelayContractFromSender1,
          'MessageRelay__InvalidUsername'
        )
      })
      it('reverts if username consists of invalid characters', async () => {
        await expect(
          messageRelayContractFromSender1.addUser('@lphanumeric0nly', 'publicKey')
        ).to.be.revertedWithCustomError(messageRelayContractFromSender1, 'MessageRelay__InvalidUsername')
        await expect(messageRelayContractFromSender1.addUser('user name', 'publicKey')).to.be.revertedWithCustomError(
          messageRelayContractFromSender1,
          'MessageRelay__InvalidUsername'
        )
        await expect(messageRelayContractFromSender1.addUser('____', 'publicKey')).to.be.revertedWithCustomError(
          messageRelayContractFromSender1,
          'MessageRelay__InvalidUsername'
        )
      })
      it('reverts if user tries to create multiple account', async () => {
        const response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
        await response.wait()

        await expect(
          messageRelayContractFromSender1.addUser(usernameSender2, publicKeySender2)
        ).to.be.revertedWithCustomError(messageRelayContractFromSender1, 'MessageRelay__AddressAlreadyRegistered')
      })
      it('reverts if username is already taken', async () => {
        const response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
        await response.wait()

        // username is already taken
        await expect(
          messageRelayContractFromReceiver1.addUser(usernameSender1, publicKeySender1)
        ).to.be.revertedWithCustomError(messageRelayContractFromReceiver1, 'MessageRelay__UsernameAlreadyExists')
      })
      it('reverts if username not found for the sender', async () => {
        await expect(messageRelayContractFromSender1.getUsername()).to.be.revertedWithCustomError(
          messageRelayContractFromSender1,
          'MessageRelay__NoUser'
        )
      })
      it('returns username of the sender', async () => {
        const response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
        await response.wait()

        const username = await messageRelayContractFromSender1.getUsername()
        assert.equal(username, usernameSender1)
      })
    })

    describe('Messaging', () => {
      beforeEach(async () => {
        let response: ContractTransaction
        response = await messageRelayContractFromSender1.addUser(usernameSender1, publicKeySender1)
        await response.wait()
        response = await messageRelayContractFromReceiver1.addUser(usernameReceiver1, publicKeyReceiver1)
        await response.wait()
      })

      it('reverts if message is empty', async () => {
        await expect(messageRelayContractFromSender1.sendMessage(usernameReceiver1, '')).to.be.revertedWithCustomError(
          messageRelayContractFromSender1,
          'MessageRelay__InvalidMessage'
        )
      })
      it('reverts if message is too long', async () => {
        const longMessage = `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque blandit scelerisque placerat. Nulla mollis urna lorem, ac congue justo hendrerit eu. Integer pretium varius nisi, sed tincidunt nisl eleifend eget. Suspendisse eu eros vel velit facilisis cursus. Nullam leo mi, tempus sed mauris sit amet, pharetra pellentesque nisi. Curabitur rhoncus nisi quis lectus facilisis ultricies. Suspendisse potenti. Nam lacus magna, euismod ac blandit eu, dictum quis mauris. Praesent vulputate leo libero, sit amet porttitor dolor dictum id. Sed vehicula libero urna, vitae molestie felis efficitur et. In in leo eros.

        Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam volutpat lobortis ex sed scelerisque. Phasellus pellentesque nisl magna, at cursus nulla dignissim in. Quisque eu blandit lectus. Maecenas pulvinar, ante nec consectetur ornare, neque libero lobortis purus, in interdum tellus mi non lacus. Aenean suscipit libero ut posuere fermentum. Aenean et sodales nulla. Praesent eu faucibus sapien proin.
        `
        await expect(
          messageRelayContractFromSender1.sendMessage(usernameReceiver1, longMessage)
        ).to.be.revertedWithCustomError(messageRelayContractFromSender1, 'MessageRelay__InvalidMessage')
      })
      it('reverts if receiver does not exist', async () => {
        await expect(
          messageRelayContractFromSender1.sendMessage(usernameReceiver2, 'u there?')
        ).to.be.revertedWithCustomError(messageRelayContractFromSender1, 'MessageRelay__NoUser')
      })
    })
  })
})
