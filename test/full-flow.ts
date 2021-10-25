// @ts-ignore
import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { expect } from "chai";
import { it } from "mocha";

describe("OrderBook - test buy and sell", function () {

    const BUY_ORDER_TYPE = 0;
    const SELL_ORDER_TYPE = 1;

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

    it("should settle one buy , one sell , and one cancel order transaction", async function () {
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
        console.log("orders[0]", orders[0]);
        expect(orders).to.have.a.lengthOf(1);
        expect(orders[0].orderId.toNumber()).to.be.equal(0);
        expect(orders[0].orderType).to.be.equal(BUY_ORDER_TYPE);
        expect(orders[0].stockId).to.be.equal(stockId);
        expect(orders[0].stockName).to.be.equal(stockName);
        expect(orders[0].stockSymbol).to.be.equal(stockSymbol);
        expect(orders[0].wallet).to.be.equal(investorAddress);
        expect(orders[0].amount.toString()).to.be.equal(investorBuyOrderAmount.toString());
        expect(orders[0].settled).to.be.false;
        expect(orders[0].settledStablecoinAmount.toNumber()).to.be.equal(0);
        expect(orders[0].settledTokenAmount.toNumber()).to.be.equal(0);
        expect(orders[0].createdAt.toNumber()).to.be.greaterThan(0);
        expect(orders[0].settledAt.toNumber()).to.be.equal(0);

        const usdcSettled = await ethers.utils.parseEther("400");
        const tokensSettled = await ethers.utils.parseEther("100");
        await orderBook.settle(investorAddress, 0, usdcSettled, tokensSettled);
        
        const ordersAfterSettlement = await orderBook.getOrders(investorAddress);        
        console.log("ordersAfterSettlement[0]", ordersAfterSettlement[0]);
        expect(orders).to.have.a.lengthOf(1);
        expect(ordersAfterSettlement[0].orderId.toNumber()).to.be.equal(0);
        expect(ordersAfterSettlement[0].orderType).to.be.equal(BUY_ORDER_TYPE);
        expect(ordersAfterSettlement[0].stockId).to.be.equal(stockId);
        expect(ordersAfterSettlement[0].stockName).to.be.equal(stockName);
        expect(ordersAfterSettlement[0].stockSymbol).to.be.equal(stockSymbol);
        expect(ordersAfterSettlement[0].wallet).to.be.equal(investorAddress);
        expect(ordersAfterSettlement[0].amount.toString()).to.be.equal(investorBuyOrderAmount.toString());
        expect(ordersAfterSettlement[0].settled).to.be.true;
        expect(ordersAfterSettlement[0].settledStablecoinAmount.toString()).to.be.equal(usdcSettled.toString());
        expect(ordersAfterSettlement[0].settledTokenAmount.toString()).to.be.equal(tokensSettled.toString());
        expect(ordersAfterSettlement[0].createdAt.toNumber()).to.be.greaterThan(0);
        expect(ordersAfterSettlement[0].settledAt.toNumber()).to.be.greaterThan(0); 

        const tokenAddress = await orderBook.tokens(stockId);
        console.log("token address", tokenAddress);
        expect(tokenAddress).to.be.not.empty;

        const stockInstance = await ethers.getContractAt("Stock", tokenAddress);
        const fetchedTokenBalance = await stockInstance.balanceOf(investorAddress);
        const fetchedUsdcBalance = await usdc.balanceOf(investorAddress);
        const fetchedOrderBookUsdcBalance = await usdc.balanceOf(orderBook.address);
        expect(fetchedTokenBalance.toString()).to.be.equal(tokensSettled.toString());
        expect(fetchedUsdcBalance.toString()).to.be.equal(investorInitialBalance.sub(usdcSettled).toString());
        expect(fetchedOrderBookUsdcBalance.toString()).to.be.equal(usdcSettled.toString());

        const sellTokenAmount = await ethers.utils.parseEther("50");
        await stockInstance.connect(investor).approve(orderBook.address, sellTokenAmount);
        await orderBook.connect(investor).createSellOrder([
            stockId,
            stockName,
            stockSymbol,
            sellTokenAmount
        ]);

        const ordersBeforeSell = await orderBook.getOrders(investorAddress);
        console.log("ordersBeforeSell[0]", ordersBeforeSell[0]);
        expect(ordersBeforeSell).to.have.a.lengthOf(2);
        expect(ordersBeforeSell[1].orderId.toNumber()).to.be.equal(1);
        expect(ordersBeforeSell[1].orderType).to.be.equal(SELL_ORDER_TYPE);
        expect(ordersBeforeSell[1].stockId).to.be.equal(stockId);
        expect(ordersBeforeSell[1].stockName).to.be.equal(stockName);
        expect(ordersBeforeSell[1].stockSymbol).to.be.equal(stockSymbol);
        expect(ordersBeforeSell[1].wallet).to.be.equal(investorAddress);
        expect(ordersBeforeSell[1].amount.toString()).to.be.equal(sellTokenAmount.toString());
        expect(ordersBeforeSell[1].settled).to.be.false;
        expect(ordersBeforeSell[1].settledStablecoinAmount.toNumber()).to.be.equal(0);
        expect(ordersBeforeSell[1].settledTokenAmount.toNumber()).to.be.equal(0);
        expect(ordersBeforeSell[1].createdAt.toNumber()).to.be.greaterThan(0);
        expect(ordersBeforeSell[1].settledAt.toNumber()).to.be.equal(0);

        const orderBookTokenBalancePreSellSettlement = await stockInstance.balanceOf(orderBook.address);
        expect(orderBookTokenBalancePreSellSettlement.toString()).to.be.equal(sellTokenAmount.toString());
        const preSellTotalTokenSupply = await stockInstance.totalSupply();
        expect(preSellTotalTokenSupply.toString()).to.be.equal(tokensSettled.toString());

        const sellOrderUsdcSettled = await ethers.utils.parseEther("200");
        const sellOrderTokenSettled = await ethers.utils.parseEther("40");
        await orderBook.settle(investorAddress, 1, sellOrderUsdcSettled, sellOrderTokenSettled);

        const ordersAfterSell = await orderBook.getOrders(investorAddress);
        console.log("ordersAfterSell[0]", ordersAfterSell[0]);
        expect(ordersAfterSell).to.have.a.lengthOf(2);
        expect(ordersAfterSell[1].orderId.toNumber()).to.be.equal(1);
        expect(ordersAfterSell[1].orderType).to.be.equal(SELL_ORDER_TYPE);
        expect(ordersAfterSell[1].stockId).to.be.equal(stockId);
        expect(ordersAfterSell[1].stockName).to.be.equal(stockName);
        expect(ordersAfterSell[1].stockSymbol).to.be.equal(stockSymbol);
        expect(ordersAfterSell[1].wallet).to.be.equal(investorAddress);
        expect(ordersAfterSell[1].amount.toString()).to.be.equal(sellTokenAmount.toString());
        expect(ordersAfterSell[1].settled).to.be.true;
        expect(ordersAfterSell[1].settledStablecoinAmount.toString()).to.be.equal(sellOrderUsdcSettled.toString());
        expect(ordersAfterSell[1].settledTokenAmount.toString()).to.be.equal(sellOrderTokenSettled.toString());
        expect(ordersAfterSell[1].createdAt.toNumber()).to.be.greaterThan(0);
        expect(ordersAfterSell[1].settledAt.toNumber()).to.be.greaterThan(0);

        const fetchedInvestorUsdcBalanceAfterSell = await usdc.balanceOf(investorAddress);
        const fetchedInvestorTokenBalanceAfterSell = await stockInstance.balanceOf(investorAddress);
        const fetchedOrderBookUsdcBalanceAfterSell = await usdc.balanceOf(orderBook.address);
        const fetchedOrderBookTokenBalanceAfterSell = await stockInstance.balanceOf(orderBook.address);
        const fetchedTokenSupplyAfterSell = await stockInstance.totalSupply();
        expect(fetchedInvestorUsdcBalanceAfterSell.toString()).to.be.equal(
            investorInitialBalance.sub(usdcSettled).add(sellOrderUsdcSettled).toString()
        );
        expect(fetchedInvestorTokenBalanceAfterSell.toString()).to.be.equal(
            tokensSettled.sub(sellOrderTokenSettled).toString()
        );
        expect(fetchedOrderBookUsdcBalanceAfterSell.toString()).to.be.equal(
            usdcSettled.sub(sellOrderUsdcSettled).toString()
        );
        expect(fetchedOrderBookTokenBalanceAfterSell.toNumber()).to.be.equal(0);
        expect(fetchedTokenSupplyAfterSell.toString()).to.be.equal(
            tokensSettled.sub(sellOrderTokenSettled).toString()
        );
    });

})
