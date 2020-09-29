const Compensation = artifacts.require("Compensation");
const Token = artifacts.require("Token");

module.exports = function(deployer) {
  deployer.then(async () => {
    // Deploy reimbursement token for testing
    const totalTokenSupply = 10000000000;
    const token = await deployer.deploy(Token, "Test Token", "TEST", totalTokenSupply);

    // Deploy compensation contract
    deployer.deploy(Compensation, token.address, totalTokenSupply/5);
  });
};
