var HDWalletProvider = require("truffle-hdwallet-provider");
const { kovanPrivateKey, kovanProvider, etherscanApiKey, mainnetProvider, privateKey } = require("./password");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 9545,
      network_id: "*", // Match any network id
      gas: 5000000,
    },
    kovan: {
      provider: function () {
        return new HDWalletProvider(kovanPrivateKey, kovanProvider);
      },
      network_id: "42",
      gasPrice: 75000000000,
      gas: 8200000,
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(privateKey, mainnetProvider);
      },
      network_id: "1",
      gasPrice: 50000001123,
      gas: 6500000,
    },
  },
  compilers: {
    solc: {
      version: "0.6.12",
      optimizer: {
        enabled: true,
        runs: 555,
      },
    },
  },
  plugins: ["truffle-plugin-verify"],
  api_keys: {
    etherscan: etherscanApiKey,
  },
};
