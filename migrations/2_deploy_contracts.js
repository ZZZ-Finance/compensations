const { amounts, addresses } = require("../test/data");

const Compensation = artifacts.require("Compensation");
const Token = artifacts.require("Token");

module.exports = function (deployer) {
  deployer.then(async () => {
    // Deploy reimbursement token for testing
    const totalCompAmount = web3.utils.toWei("1136400");
    const token = await deployer.deploy(Token, "Test Token", "TEST", totalCompAmount);

    // Deploy compensation contract
    const instance = await deployer.deploy(Compensation, token.address, totalCompAmount, 10);

    const amountsWei = amounts.map((a) => web3.utils.toWei(a));
    await instance.addMultipleAddressesforCompensation(addresses, amountsWei);
  });
};
