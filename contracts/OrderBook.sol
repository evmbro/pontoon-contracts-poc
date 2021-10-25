// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Stock.sol";

contract OrderBook {

    //------------------------
    //  TYPES
    //------------------------
    enum OrderType { BUY, SELL }

    struct Order {
        uint256 orderId;
        OrderType orderType;
        string stockId;
        string stockName;
        string stockSymbol;
        address wallet;
        uint256 amount;
        bool settled;
        uint256 settledStablecoinAmount;
        uint256 settledTokenAmount;
        uint256 createdAt;
        uint256 settledAt;
    }

    struct NewOrderRequest {
        string stockId;
        string stockName;
        string stockSymbol;
        uint256 amount;
    }

    //------------------------
    //  STATE
    //------------------------
    mapping (address => Order[]) public orders;
    mapping (string => address) public tokens;
    address manager;
    address stablecoin;

    //------------------------
    //  EVENTS
    //------------------------
    event BuyOrderCreated(address indexed wallet, string stockId, uint256 orderId, uint256 amount, uint256 timestamp);
    event SellOrderCreated(address indexed wallet, string stockId, uint256 orderId, uint256 amount, uint256 timestamp);
    event OrderSettled(address indexed wallet, uint256 orderId, uint256 timestamp);

    //------------------------
    //  CONSTRUCTOR
    //------------------------
    constructor(address _manager, address _stablecoin) {
        manager = _manager;
        stablecoin = _stablecoin;
    }

    //------------------------
    //  MODIFIERS
    //------------------------
    modifier isManager() { require(msg.sender == manager, "OrderBook: !manager"); _; }

    //---------------------------------
    //  WRITE
    //---------------------------------
    function createBuyOrder(NewOrderRequest memory request) external {
        uint256 orderId = orders[msg.sender].length;
        require(orderId == 0 || orders[msg.sender][orderId - 1].settled, "OrderdBook: pending order exists");
        orders[msg.sender].push(
            Order(
                orderId,
                OrderType.BUY,
                request.stockId,
                request.stockName,
                request.stockSymbol,
                msg.sender,
                request.amount,
                false,
                0, 0, block.timestamp, 0
            )
        );
        IERC20(stablecoin).transferFrom(msg.sender, address(this), request.amount);
        emit BuyOrderCreated(msg.sender, request.stockId, orderId, request.amount, block.timestamp);
    }

    function createSellOrder(NewOrderRequest memory request) external {
        uint256 orderId = orders[msg.sender].length;
        require(orderId == 0 || orders[msg.sender][orderId - 1].settled, "OrderdBook: pending order exists");
        orders[msg.sender].push(
            Order(
                orderId,
                OrderType.SELL,
                request.stockId,
                request.stockName,
                request.stockSymbol,
                msg.sender,
                request.amount,
                false,
                0, 0, block.timestamp, 0
            )
        );
        IERC20(tokens[request.stockId]).transferFrom(msg.sender, address(this), request.amount);
        emit SellOrderCreated(msg.sender, request.stockId, orderId, request.amount, block.timestamp);
    }

    function settle(
        address wallet,
        uint256 orderId,
        uint256 stablecoinAmountSettled,
        uint256 tokenAmountSettled
    ) external isManager {
        Order storage order = orders[wallet][orderId];
        require(!order.settled, "OrderBook: order settled");
        if (order.orderType == OrderType.BUY) { 
            _settleBuy(order, stablecoinAmountSettled, tokenAmountSettled);
        } 
        else {
            _settleSell(order, stablecoinAmountSettled, tokenAmountSettled);
        }
    }

    //---------------------------------
    //  READ
    //---------------------------------
    function getOrders(address wallet) external view returns (Order[] memory) { return orders[wallet]; }

    //---------------------------------
    //  INTERNAL
    //---------------------------------
    function _settleBuy(
        Order storage order,
        uint256 stablecoinAmountSettled,
        uint256 tokenAmountSettled
    ) private {
        if (stablecoinAmountSettled > 0) {
            if (tokens[order.stockId] == address(0)) {
                tokens[order.stockId] = address(new Stock(
                    order.stockName,
                    order.stockSymbol,
                    order.wallet,
                    tokenAmountSettled,
                    address(this)
                ));
            } else {
                Stock(tokens[order.stockId]).mint(order.wallet, tokenAmountSettled);
            }
        }
        order.settled = true;
        order.settledStablecoinAmount = stablecoinAmountSettled;
        order.settledTokenAmount = tokenAmountSettled;
        order.settledAt = block.timestamp;
        uint256 refund = order.amount - order.settledStablecoinAmount;
        if (refund > 0) { IERC20(stablecoin).transfer(msg.sender, refund); }
        emit OrderSettled(order.wallet, order.orderId, order.settledAt);
    }

    function _settleSell(
        Order storage order,
        uint256 stablecoinAmountSettled,
        uint256 tokenAmountSettled
    ) private {
        if (tokenAmountSettled > 0) {
            Stock(tokens[order.stockId]).burn(address(this), tokenAmountSettled);
            IERC20(stablecoin).transfer(msg.sender, stablecoinAmountSettled);
        }
        order.settled = true;
        order.settledStablecoinAmount = stablecoinAmountSettled;
        order.settledTokenAmount = tokenAmountSettled;
        order.settledAt = block.timestamp;
        uint256 refund = order.amount - tokenAmountSettled;
        if (refund > 0) { Stock(tokens[order.stockId]).transfer(msg.sender, refund); }
        emit OrderSettled(order.wallet, order.orderId, order.settledAt);
    }

}
