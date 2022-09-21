import { network } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { verify } from '../utils/verify'

const developmentChains = ['hardhat', 'localhost']

const func: DeployFunction = async ({
  getNamedAccounts,
  deployments,
}: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const messageRelayContract = await deploy('MessageRelay', {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(messageRelayContract.address, [])
  }
  log('----------------------------------------')
}

func.tags = ['all']
export default func
