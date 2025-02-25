import React, { useState, useEffect } from "react";
import { Button, Col, Form, FormControl, Badge, Modal, Row, Toast, ToastContainer } from "react-bootstrap";
import DataTable from "react-data-table-component";

function DronesContent(props) {
    const StarwingsMasterSigner = props.StarwingsMasterSigner;
    const [droneAddressList, setDroneAddressList] = useState([]);
    const [inputAddDrone, setInputAddDrone] = useState("");
    const [inputAddDroneId, setInputAddDroneId] = useState("");
    const [inputAddDroneType, setInputAddDroneType] = useState("");
    const [modalIsShown, setModalIsShown] = useState(false);
    const [pending, setPending] = useState(true);
    const [tooltip, setTooltip] = useState({ show: false, title: "Undefined", body: "None", variant: "" });

    useEffect(() => {
        if (StarwingsMasterSigner) {
            getDroneList();

            StarwingsMasterSigner.on("DroneAdded", (droneAddress) => {
                getDroneList();
            });

            StarwingsMasterSigner.on("DroneDeleted", (droneAddress) => {
                getDroneList();
            });
        }
    }, [StarwingsMasterSigner]);

    const toggleTooltip = (show) =>
        setTooltip({ show: show, title: tooltip.title, body: tooltip.body, variant: tooltip.variant });
    const showTooltip = function (title, body, variant) {
        setTooltip({ show: true, title: title, body: body, variant: variant });
    };

    function onChangeInputAddDrone(event) {
        event.preventDefault();
        setInputAddDrone(event.target.value);
    }

    function onChangeInputAddDroneId(event) {
        event.preventDefault();
        setInputAddDroneId(event.target.value);
    }

    function onChangeInputAddDroneType(event) {
        event.preventDefault();
        setInputAddDroneType(event.target.value);
    }

    function hideModal() {
        setModalIsShown(false);
    }

    function showModal() {
        setModalIsShown(true);
    }

    async function onSubmitAddDrone(event) {
        event.preventDefault();

        try {
            const tx = await StarwingsMasterSigner.addDrone(inputAddDrone, inputAddDroneId, inputAddDroneType);
            showTooltip("Transaciton sent !", tx.hash, "success");
        } catch (error) {
            showTooltip("Error", error?.data?.message, "danger");
        }

        setInputAddDrone("");
        setInputAddDroneId("");
        setInputAddDroneType("");
        hideModal();
    }

    const getDroneList = async () => {
        setPending(true);
        toggleTooltip(false);
        try {
            const droneAddressListResult = await StarwingsMasterSigner.getDroneList();
            setDroneAddressList(droneAddressListResult);
            //console.log(droneAddressList);
        } catch (error) {
            console.error(error);
        }

        setPending(false);
    };

    const handleDeleteDroneClick = async (state) => {
        console.log(state.target.id);
        await StarwingsMasterSigner.deleteDrone(state.target.id);
    };

    const columns = [
        {
            name: "Index",
            selector: (row) => row.index.toString(),
        },
        {
            name: "Deleted",
            selector: (row) => {
                return row.isDeleted ? <Badge bg="danger">true</Badge> : <Badge bg="success">false</Badge>;
            },
        },
        {
            name: "Id",
            selector: (row) => row.droneId,
        },
        {
            name: "Type",
            selector: (row) => row.droneType,
        },
        {
            name: "Addr",
            selector: (row) => row.droneAddress,
        },
        {
            cell: (row) =>
                row.isDeleted ? (
                    <Button onClick={handleDeleteDroneClick} id={row.droneAddress} variant="danger" size="sm" disabled>
                        The end!
                    </Button>
                ) : (
                    <Button onClick={handleDeleteDroneClick} id={row.droneAddress} variant="danger" size="sm">
                        Delete
                    </Button>
                ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
        },
    ];

    return (
        <div className="DronesContent">
            <Row>
                <Col
                    sm="auto"
                    onClick={async () => {
                        await getDroneList();
                    }}
                >
                    <Button variant="primary">Refresh</Button>
                </Col>
                <Col>
                    <Button variant="primary" onClick={showModal}>
                        + Add Drone
                    </Button>
                </Col>
            </Row>
            <Row style={{ marginTop: "30px" }}>
                <Col>
                    {/* {droneAddressList && droneAddressList.length > 0 ? (
                        <span>There is drones.</span>
                    ) : (
                        <span>There is no drones yet.</span>
                    )} */}
                    <DataTable columns={columns} data={droneAddressList} progressPending={pending} />
                </Col>
            </Row>

            <Modal
                show={modalIsShown}
                onHide={hideModal}
                keyboard={false}
                aria-labelledby="contained-modal-title-vcenter"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Add Drone</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Label>Drone Address</Form.Label>
                    <FormControl
                        placeholder="0x..."
                        aria-label="0x..."
                        value={inputAddDrone}
                        onChange={onChangeInputAddDrone}
                    />
                    <Form.Label>Drone Id</Form.Label>
                    <FormControl value={inputAddDroneId} onChange={onChangeInputAddDroneId} />
                    <Form.Label>Drone Type</Form.Label>
                    <FormControl value={inputAddDroneType} onChange={onChangeInputAddDroneType} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={hideModal}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        disabled={StarwingsMasterSigner && inputAddDrone === ""}
                        onClick={onSubmitAddDrone}
                    >
                        Add
                    </Button>
                </Modal.Footer>
            </Modal>
            <ToastContainer className="p-3" position="bottom-end">
                <Toast show={tooltip.show} onClose={toggleTooltip} bg={tooltip.variant}>
                    <Toast.Header>
                        <strong className="me-auto">{tooltip.title}</strong>
                    </Toast.Header>
                    <Toast.Body>{tooltip.body}</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    );
}

export default DronesContent;
