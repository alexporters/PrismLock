import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPrismLock = await deploy("PrismLock", {
    from: deployer,
    log: true,
  });

  console.log(`PrismLock contract: `, deployedPrismLock.address);
};
export default func;
func.id = "deploy_prism_lock"; // id required to prevent reexecution
func.tags = ["PrismLock"];
