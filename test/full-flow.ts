// @ts-ignore
import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { expect } from "chai";
import { it } from "mocha";

describe("OrderBook - test buy and sell", function () {

    let usdc: Contract;
    let orderBook: Contract;

    let manager: Signer;
    let managerAddress: string;

    let investor: Signer;
    let investorAddress: string;

    before(async function () {
        const accounts: Signer[] = await ethers.getSigners();
        manager = accounts[0];
        managerAddress = await manager.getAddress();

        investor = accounts[1];
        investorAddress = await investor.getAddress();

        const USDC = await ethers.getContractFactory("USDC", manager);
        const supplyWei = ethers.utils.parseEther("100000000000");
        usdc = await USDC.deploy(supplyWei);

        const OrderBook = await ethers.getContractFactory("OrderBook", manager);
        orderBook = await OrderBook.deploy(
            await manager.getAddress(),
            usdc.address
        );
    });

    it("should deploy", async function () {
        const investorInitialBalance = await ethers.utils.parseEther("1000");
        await usdc.transfer(investorAddress, investorInitialBalance);
        expect((await usdc.balanceOf(investorAddress)).toString()).to.be.equal(investorInitialBalance.toString());

        const investorBuyOrderAmount = await ethers.utils.parseEther("500");
        const stockId = "new-stock-id";
        const stockSymbol = "stock-symbol";
        const stockName = "stock-name";
        await usdc.connect(investor).approve(orderBook.address, investorBuyOrderAmount);
        await orderBook.connect(investor).createBuyOrder([
            stockId,
            stockName,
            stockSymbol,
            investorBuyOrderAmount
        ]);

        const orders = await orderBook.getOrders(investorAddress);
        
        const usdcSettled = await ethers.utils.parseEther("400");
        const tokensSettled = await ethers.utils.parseEther("100");
        await orderBook.settle(investorAddress, 0, usdcSettled, tokensSettled);
    });

})