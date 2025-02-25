//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./interfaces/IDeliveryManager.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {StarwingsDataLib} from "./librairies/StarwingsDataLib.sol";

/**
 *  @title Delivery Master
 *  @author Damien
 *  @notice This contract manage all the deliveries.
 */
contract DeliveryManager is IDeliveryManager {
    using Strings for uint256;

    mapping(string => uint256) private deliveriesIndex;
    Delivery[] private deliveries;
    IAccessControl private accessControl;

    /// @notice Modifier to restrict function to specific role
    /// @dev Use the library to retrieve bytes32 values when calling the modifier
    /// @param _role The role authorize to access the function
    modifier onlyRole(bytes32 _role) {
        require(accessControl.hasRole(_role, msg.sender), "Access refused");
        _;
    }

    constructor(address accessControlAddress) {
        accessControl = IAccessControl(accessControlAddress);
    }

    /// @notice Creates a new delivery
    /// @dev
    /// @param _delivery a struct containing delivery information, all properties are required expect deliveryId
    /// @return Delivery ID
    function newDelivery(Delivery memory _delivery)
        external
        onlyRole(StarwingsDataLib.ADMIN_ROLE)
        returns (string memory)
    {
        require(bytes(_delivery.supplierOrderId).length > 0, "orderId:empty");
        require(bytes(_delivery.from).length > 0, "from:empty");
        require(_delivery.fromAddr != address(0), "fromAddr:0x0");
        require(bytes(_delivery.to).length > 0, "to:empty");
        require(_delivery.toAddr != address(0), "toAddr:0x0");
        require(_delivery.fromHubId != 0, "fromHubId:0");
        require(_delivery.toHubId != 0, "toHubId:0");

        _delivery.state = DeliveryState.noInfo;
        // Generate pseudo random deliveryID
        _delivery.deliveryId = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    _delivery.fromAddr,
                    _delivery.toAddr,
                    _delivery.supplierOrderId
                )
            )
        ).toHexString();

        deliveries.push(_delivery);
        deliveriesIndex[_delivery.deliveryId] = deliveries.length - 1;

        emit DeliveryCreated(_delivery.deliveryId);

        return _delivery.deliveryId;
    }

    /// @notice Get delivery by ID
    /// @dev
    /// @param _deliveryId Self explanatory
    /// @return Delivery struct
    function getDelivery(string memory _deliveryId)
        external
        view
        returns (Delivery memory)
    {
        //console.log("[Contract Debug] get DeliveryId:%s", _deliveryId);

        uint256 tabIndex = deliveriesIndex[_deliveryId];

        require(tabIndex < deliveries.length, "Out of size index");
        require(
            bytes(deliveries[tabIndex].deliveryId).length > 0,
            "Delivery does not exist"
        );

        // console.log(
        //     "[Contract Debug] get toAddr:%s",
        //     deliveries[tabIndex].toAddr
        // );

        return deliveries[tabIndex];
    }

    /// @notice Update the delivery state
    /// @dev
    /// @param _deliveryId The delivery ID to update
    /// @param _deliveryState The new state, using DeliveryState enum
    function setDeliveryState(
        string memory _deliveryId,
        DeliveryState _deliveryState
    ) external {
        uint256 tabIndex = deliveriesIndex[_deliveryId];

        require(tabIndex < deliveries.length, "Out of size index");
        require(
            bytes(deliveries[tabIndex].deliveryId).length > 0,
            "Delivery does not exist"
        );

        DeliveryState oldState = deliveries[tabIndex].state;
        deliveries[tabIndex].state = _deliveryState;
        emit DeliveryStatusUpdated(
            deliveries[tabIndex].deliveryId,
            oldState,
            _deliveryState
        );
    }

    /// @notice Get all deliveries ID to be able to query the map after
    /// @dev
    /// @return All deliveries id
    function getAllDeliveries() external view returns (Delivery[] memory) {
        return deliveries;
    }
}
