require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.9",
    paths: {
        artifacts: "./client/src/artifacts",
    },
    networks: {
        hardhat: {
            chainId: 1337,
        },
        ropsten: {
            url: process.env.INFURA_ROPSTEN_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
        fantom_testnet: {
            url: process.env.FANTOM_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
        arbitrum_testnet: {
            url: process.env.ARBITRUM_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
        polygon_testnet: {
            url: process.env.POLYGON_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
        optimism_testnet: {
            url: process.env.OPTIMISM_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
        },
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 1000,
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
    },
    // etherscan: {
    //     apiKey: process.env.ETHERSCAN_API_KEY,
    // },
};
