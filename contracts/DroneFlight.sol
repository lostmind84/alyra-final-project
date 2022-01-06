//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./interfaces/IConopsManager.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import {StarwingsDataLib} from "./librairies/StarwingsDataLib.sol";

abstract contract DroneFlight {
    using StarwingsDataLib for StarwingsDataLib.FlightData;

    // 1. State variables
    IConopsManager private conopsManager;
    IAccessControl private accessControl;

    bool allowedToFlight;
    // Drone events
    // bool private droneParcelPickUp;
    // bool private droneTakeOff;

    StarwingsDataLib.FlightData private datas;
    FlightState droneFlightState;
    FlightState pilotFlightState;
    Check private preChecks;
    Check private postChecks;

    // 2. Events
    // 3. Modifiers
    /**
     * @dev Check the msg.sender's role.
     */
    modifier onlyRole(bytes32 _role) {
        require(accessControl.hasRole(_role, msg.sender), "Access refused");
        _;
    }

    // 4. Structs, arrays, enums
    Event[] private riskEvent;
    // Drone checkpoints
    Checkpoint[] private checkpoints;
    StarwingsDataLib.AirRisk[] airRisks;

    /**
     *  PreFlight : flight is not started
     *  Canceled : flight canceled (only if in Preflight state)
     *  Flying : In flight ( only if in Preflight state and allowedToFlight)
     *  Paused : In pause/wait (only if in Flying state)
     *  Aborted : Flight aborted (only if Flying / Paused)
     *  Ended : Flight Ended correctly (only if Flying/Pause)
     */
    enum FlightState {
        PreFlight,
        Canceled,
        Flying,
        Paused,
        Aborted,
        Ended
    }

    enum RiskType {
        Engine,
        Gps,
        Telecom
    }

    enum CheckType {
        Engine,
        Battery,
        ControlStation
    }

    struct Check {
        mapping(CheckType => bool) checkType;
    }

    struct Event {
        uint256 dateTime; // timespan
        RiskType risk;
    }

    struct Coordinate {
        uint256 latitude;
        uint256 longitude;
    }

    struct Checkpoint {
        Coordinate coordo;
        uint256 time;
    }

    // 5. Constructor
    constructor(
        address _conopsManager,
        address _accessControlAddress,
        StarwingsDataLib.FlightData memory data
    ) {
        conopsManager = IConopsManager(_conopsManager);
        accessControl = IAccessControl(_accessControlAddress);
        datas.conopsId = data.conopsId;
        datas.droneAddr = data.droneAddr;
        datas.piloteAddr = data.piloteAddr;
        datas.droneType = data.droneType;
        datas.droneId = data.droneId;
        datas.depart = data.depart;
        datas.destination = data.destination;
        datas.flightDuration = data.flightDuration;
        datas.flightDatetime = data.flightDatetime;
        _setupAirRisk();
    }

    // 6. Fallback — Receive function
    // 7. External visible functions

    function preFlightChecks(CheckType _checkType) external {
        require(!preChecks.checkType[_checkType], "already checked");
        preChecks.checkType[_checkType] = true;
    }

    function postFlightChecks(CheckType _checkType) external {
        require(!postChecks.checkType[_checkType], "already checked");
        postChecks.checkType[_checkType] = true;
    }

    function getPreFlightChecks(CheckType _checkType)
        external
        view
        returns (bool)
    {
        return preChecks.checkType[_checkType];
    }

    function getPostFlightChecks(CheckType _checkType)
        external
        view
        returns (bool)
    {
        return postChecks.checkType[_checkType];
    }

    // function checkEngine()
    //     external
    //     onlyRole(StarwingsDataLib.PILOT_ROLE)
    //     returns (bool)
    // {
    //     require(!engineCheck, "engine already checked");
    //     engineCheck = true;

    //     return engineCheck;
    // }

    // function getEngineCheck() external view returns (bool) {
    //     return engineCheck;
    // }

    // function checkBattery()
    //     external
    //     onlyRole(StarwingsDataLib.PILOT_ROLE)
    //     returns (bool)
    // {
    //     require(!batteryCheck, "battery already checked");
    //     batteryCheck = true;

    //     return batteryCheck;
    // }

    // function getBatteryCheck() external view returns (bool) {
    //     return batteryCheck;
    // }

    // function checkControlStation()
    //     external
    //     onlyRole(StarwingsDataLib.PILOT_ROLE)
    //     returns (bool)
    // {
    //     require(!controlStationCheck, "station already checked");
    //     controlStationCheck = true;

    //     return controlStationCheck;
    // }

    // function getControlStationCheck() external view returns (bool) {
    //     return controlStationCheck;
    // }

    function newRiskEvent(Event memory _event)
        external
        onlyRole(StarwingsDataLib.DRONE_ROLE)
    {
        riskEvent.push(_event);
    }

    function viewRiskEvent(uint256 _eventId)
        external
        view
        returns (Event memory)
    {
        return riskEvent[_eventId];
    }

    function validateAirRisk(uint256 _airRiskId)
        external
        onlyRole(StarwingsDataLib.PILOT_ROLE)
    {
        require(!airRisks[_airRiskId].validated, "airRisk already validated");
        airRisks[_airRiskId].validated = true;
        _allowToFlight();
    }

    function cancelAirRisk(uint256 _airRiskId)
        external
        onlyRole(StarwingsDataLib.PILOT_ROLE)
    {
        require(airRisks[_airRiskId].validated, "airRisk already canceled");
        airRisks[_airRiskId].validated = false;
        _allowToFlight();
    }

    function viewAirRisks()
        external
        view
        returns (StarwingsDataLib.AirRisk[] memory)
    {
        return airRisks;
    }

    function cancelFlight() external onlyRole(StarwingsDataLib.PILOT_ROLE) {
        require(
            pilotFlightState == FlightState.PreFlight,
            "flight already started/canceled"
        );

        _changeDroneFlightState(FlightState(1));
        _changePilotFlightState(FlightState(1));
        _allowToFlight();
    }

    function changeFlightStatus(uint256 _status)
        external
        onlyRole(StarwingsDataLib.DRONE_ROLE)
    {
        bool isPilot = accessControl.hasRole(
            StarwingsDataLib.PILOT_ROLE,
            msg.sender
        );
        bool isDrone = accessControl.hasRole(
            StarwingsDataLib.DRONE_ROLE,
            msg.sender
        );

        require(isPilot || isDrone, "Access refused");
        require(_status != 1, "Cannot cancel flight this way");
        require(allowedToFlight, "Flying is not allowed");
        require(
            _status > uint256(FlightState.PreFlight),
            "Not a valide logical status"
        );
        require(
            _status < uint256(type(FlightState).max),
            "Not a valide logical status"
        );

        FlightState statetype;
        if (isDrone) {
            statetype = droneFlightState;
        } else {
            statetype = pilotFlightState;
        }

        require(
            ((_status == 2 && statetype == FlightState.PreFlight) ||
                (_status > 2 && uint256(statetype) >= 2)),
            "status not allowed"
        );

        if (isDrone) {
            _changeDroneFlightState(FlightState(_status));
        } else {
            _changePilotFlightState(FlightState(_status));
        }
    }

    function viewDroneFlightstatus() external view returns (FlightState) {
        return droneFlightState;
    }

    function viewPilotFlightstatus() external view returns (FlightState) {
        return pilotFlightState;
    }

    // 8. Public visible functions
    // 9. Internal visible functions

    function _setupAirRisk() internal {
        StarwingsDataLib.SimpleConops memory conops = conopsManager.viewConops(
            datas.conopsId
        );
        for (uint256 i = 0; i < conops.airRiskList.length; i++) {
            StarwingsDataLib.AirRisk storage airRisk = airRisks.push();
            airRisk.name = conops.airRiskList[i].name;
            airRisk.riskType = conops.airRiskList[i].riskType;
        }
    }

    function _changeDroneFlightState(FlightState _value) internal {
        droneFlightState = _value;
    }

    function _changePilotFlightState(FlightState _value) internal {
        pilotFlightState = _value;
    }

    function _standardAllowToFlight() internal view returns(bool) {
        bool allowed = true;

        if (pilotFlightState == FlightState.Canceled) {
            allowed = false;
        } else {
            for (uint256 i = 0; i < airRisks.length; i++) {
                if (!airRisks[i].validated) {
                    allowed = false;
                }
            }
        }

        return allowed;
    }

    function _allowToFlight() internal {
        bool standardAllowed = _standardAllowToFlight();
        bool customAllowed = _customAllowToFlight();

        allowedToFlight = (standardAllowed && customAllowed);
    }

    function _customAllowToFlight() internal virtual returns(bool);

}
