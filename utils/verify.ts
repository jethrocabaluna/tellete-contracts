import { run } from 'hardhat'

export const verify = async (contractAddress: string, args: any) => {
  if (!process.env.ETHERSCAN_API_KEY) return
  console.log('Verifying contract...')

  try {
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (err) {
    // @ts-ignore
    if (err.message.toLowerCase().includes('already verified')) {
      console.log('Already verified!')
    } else {
      console.error(err)
    }
  }
}
