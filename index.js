import { ethers } from "./ethers-v5-min.js";
import { contractABI, contractAddress } from "./constants.js";

const backdrop = document.getElementById("backdrop");
const modal = document.getElementById("modal");
const connectBtn = document.getElementById("connect-btn");
const balanceBtn = document.getElementById("balance-btn");
const fundBtn = document.getElementById("fund-btn");
const withdrawBtn = document.getElementById("withdraw-btn");

let timeoutId;

const enableModalFailed = (errMsg) => {
    modal.innerHTML = `
    <img class="metamask-image" src="./assets/metamask-icon.png" alt="metamask-image" />
        <span class="error-text">
            ${errMsg}
        </span>
    `;
    backdrop.classList.add("backdrop");
    modal.classList.add("modal");

    timeoutId = setTimeout(() => {
        console.log("Error-Timeout-Triggered!");
        backdrop.click();
    }, 6000);
};

const enableModalSuccess = (successMsg) => {
    modal.innerHTML = `
    <img class="metamask-image" src="./assets/metamask-icon.png" alt="metamask-image" />
        <span class="success-text">
            ${successMsg}
        </span>
    `;
    backdrop.classList.add("backdrop");
    modal.classList.add("modal");

    timeoutId = setTimeout(() => {
        console.log("Success-Timeout-Triggered!");
        backdrop.click();
    }, 1500);
};

const backdropHandler = () => {
    backdrop.classList.remove("backdrop");
    modal.classList.remove("modal");
    modal.innerText = "";
    clearTimeout(timeoutId);
};

const accountHelper = (accounts) => {
    connectBtn.innerText =
        "Connected to " +
        accounts[0].slice(0, 5) +
        "..." +
        accounts[0].slice(accounts[0].length - 5, accounts[0].length);
};

const accountsChangeHandler = async () => {
    try {
        await ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                accountHelper(accounts);
            } else {
                connectBtn.innerText = "Connect Wallet";
                console.log("\x1b[31m%s\x1b[0m", "Disconnected!");
            }
        });
    } catch (e) {
        console.log("\x1b[31m%s\x1b[0m", `index.js -- ERROR: ${e.message}`);
        enableModalFailed(e.message);
    }
};

const isConnected = async (expectError = false) => {
    const accounts = await ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
        const accounts = await ethereum.request({
            method: "eth_requestAccounts",
        });

        accountHelper(accounts);
    } else {
        console.log("\x1b[31m%s\x1b[0m", "Wallet Not Connected! :(");
        if (expectError) {
            throw new Error("Wallet Not Connected! :(");
        }
    }
};

const walletConnectionHandler = async () => {
    if (typeof ethereum !== "undefined") {
        try {
            const accounts = await ethereum.request({
                method: "eth_requestAccounts",
            });

            accountHelper(accounts);
        } catch (e) {
            console.log("\x1b[31m%s\x1b[0m", `index.js -- ERROR: ${e.message}`);
            enableModalFailed(e.message);
        }
    } else {
        console.log("\x1b[31m%s\x1b[0m", "PLEASE INSTALL METAMASK");
        enableModalFailed("PLEASE INSTALL METAMASK");
    }
};
const balanceHandler = async () => {
    if (typeof ethereum !== "undefined") {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        try {
            await isConnected(true);
            const currentBalance = await provider.getBalance(contract.address);
            const formattedBalance = ethers.utils.formatEther(currentBalance.toString());
            console.log("balance: ", formattedBalance + " ETH");
            balanceBtn.innerText = formattedBalance + " ETH\nCheck Again";
        } catch (e) {
            console.log("\x1b[31m%s\x1b[0m", `index.js -- ERROR: ${e.message}`);
            enableModalFailed(e.message);
        }
    } else {
        console.log("\x1b[31m%s\x1b[0m", "PLEASE INSTALL METAMASK");
        enableModalFailed("PLEASE INSTALL METAMASK");
    }
};

const fundHandler = async () => {
    if (typeof ethereum !== "undefined") {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        try {
            await isConnected(true);
            const ethAmount = document.getElementById("fund-amount").value;
            const parsedEtherAmount = ethers.utils.parseEther(ethAmount).toString();
            const txResponse = await contract.fund({ value: parsedEtherAmount });
            await txResponse.wait(1);
            await listenTxBeingMined(txResponse.hash, provider);
            console.log("\x1b[32m%s\x1b[0m", "Funded!");

            document.getElementById("fund-amount").value = "";
            document.getElementById("fund-amount").innerText = "";
            enableModalSuccess("Amount Funded Successfully!");
        } catch (e) {
            console.log("\x1b[31m%s\x1b[0m", `index.js -- ERROR: ${e.message}`);
            enableModalFailed(e.data ? e.data.message : e.message);
        }
    } else {
        console.log("\x1b[31m%s\x1b[0m", "PLEASE INSTALL METAMASK");
        enableModalFailed("PLEASE INSTALL METAMASK");
    }
};

const withdrawHandler = async () => {
    if (typeof ethereum !== "undefined") {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        try {
            await isConnected(true);
            const currentBalance = await provider.getBalance(contract.address);
            if (+currentBalance.toString() > 0) {
                const txResponse = await contract.withdraw();
                await txResponse.wait(1);
                await listenTxBeingMined(txResponse.hash, provider);
                console.log("\x1b[32m%s\x1b[0m", "Withdrawal Successful!");
                enableModalSuccess("Widthdrawal was Successful!");
            } else {
                console.log("\x1b[31m%s\x1b[0m", "Nothing to Withdraw!");
                enableModalFailed("Nothing to Withdraw!");
            }
        } catch (e) {
            console.log("\x1b[31m%s\x1b[0m", `index.js -- ERROR: ${e.message}`);
            enableModalFailed(e.message);
        }
    } else {
        console.log("\x1b[31m%s\x1b[0m", "PLEASE INSTALL METAMASK");
        enableModalFailed("PLEASE INSTALL METAMASK");
    }
};

const listenTxBeingMined = (transactionHash, provider) => {
    console.log("\x1b[33m%s\x1b[0m", `Waiting Transaction with hash: ${transactionHash} to be mined...`);

    return new Promise((resolve, reject) => {
        provider.once(transactionHash, (transactionReceipt) => {
            console.log(
                "\x1b[32m%s\x1b[0m",
                `Transaction mined with ${transactionReceipt.confirmations} block Confirmations!`
            );

            resolve();
        });
    });
};

connectBtn.addEventListener("click", walletConnectionHandler);
balanceBtn.addEventListener("click", balanceHandler);
fundBtn.addEventListener("click", fundHandler);
withdrawBtn.addEventListener("click", withdrawHandler);
backdrop.addEventListener("click", backdropHandler);

const init = async () => {
    if (typeof ethereum !== "undefined") {
        await isConnected();
        await accountsChangeHandler();
    } else {
        console.log("\x1b[31m%s\x1b[0m", "PLEASE INSTALL METAMASK");
        enableModalFailed("PLEASE INSTALL METAMASK");
    }
};

init()
    .then(() => console.log("\x1b[32mApp Initialized!\x1b[0m"))
    .catch((e) => {
        console.log(`\x1b[0mindex.js -- ERROR ${e}\x1b[0m`);
        enableModalFailed(e.message);
    });
