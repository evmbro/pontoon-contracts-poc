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
        address wallet;
        uint256 amount;
        bool settled;
        uint256 settledAmount;
        uint256 settledTokenAmount;
        uint256 createdAt;
        uint256 settledAt;
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
    event BuyOrderCreated(address indexed wallet, string stockId, uint256 amount, uint256 timestamp);
    event SellOrderCreated(address indexed wallet, string stockId, uint256 amount, uint256 timestamp);
    event OrderSettled();

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
    function createBuyOrder(string memory stockId, uint256 stablecoinAmount) external {
        uint256 orderId = orders[msg.sender].length;
        require(orderId == 0 || orders[msg.sender][orderId - 1].settled, "OrderdBook: pending order exists");
        orders[msg.sender].push(
            Order(orderId, OrderType.BUY, stockId, msg.sender, stablecoinAmount, false, 0, 0, 0, 0)
        );
        IERC20(stablecoin).transferFrom(msg.sender, address(this), stablecoinAmount);
        emit BuyOrderCreated(msg.sender, stockId, stablecoinAmount, block.timestamp);
    }

    function createSellOrder(string memory stockId, uint256 stockAmount) external {
        uint256 orderId = orders[msg.sender].length;
        require(orderId == 0 || orders[msg.sender][orderId - 1].settled, "OrderdBook: pending order exists");
        orders[msg.sender].push(
            Order(orderId, OrderType.SELL, stockId, msg.sender, stockAmount, false, 0, 0, 0, 0)
        );
        IERC20(tokens[stockId]).transferFrom(msg.sender, address(this), stockAmount);
        emit SellOrderCreated(msg.sender, stockId, stockAmount, block.timestamp);
    }

    function settle(
        address wallet,
        uint256 orderId,
        uint256 stablecoinAmountSettled,
        uint256 tokenAmountSettled
    ) external isManager {
        Order memory order = orders[wallet][orderId];
        require(!order.settled, "OrderBook: order settled");
        if (order.orderType == OrderType.BUY) { 
            _settleBuy(wallet, orderId, stablecoinAmountSettled, tokenAmountSettled);
        } 
        else {
            _settleSell(wallet, orderId, stablecoinAmountSettled, tokenAmountSettled);
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
        address wallet,
        uint256 orderId,
        uint256 stablecoinAmountSettled,
        uint256 tokenAmountSettled
    ) private {
        
    }

    function _settleSell(
        address wallet,
        uint256 orderId,
        uint256 stablecoinAmountSettled,
        uint256 tokenAmountSettled
    ) private {

    }

}
