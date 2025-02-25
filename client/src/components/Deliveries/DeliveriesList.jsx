import React, { useState, useEffect, useReducer, Fragment } from "react";
import { ethers } from "ethers";
import DeliveryArtifact from "../../artifacts/contracts/DeliveryManager.sol/DeliveryManager.json";
import { Button, Col, Modal, Row, Toast, ToastContainer } from "react-bootstrap";
import DataTable from "react-data-table-component";
import DeliveryForm from "./DeliveryForm";
import FactoryModal from "./FactoryModal";

const contractAddresses = require("../../contractAddresses.json");

const DeliveryManagerAddress = contractAddresses.DeliveryManager;

const formReducer = (state, event) => {
    if (event.type === "reset") {
        return {};
    }

    return {
        ...state,
        [event.name]: event.value,
    };
};

function DeliveriesList(props) {
    const state = props.state;
    const [deliveriesList, setDeliveriesList] = useState([]);
    const [deliveryManager, setDeliveryManager] = useState({});
    const [modalIsShown, setModalIsShown] = useState(false);
    const [formData, setFormData] = useReducer(formReducer, {});
    const [pending, setPending] = useState(true);
    const [factoryModalIsShown, setFactoryModalIsShown] = useState(false);
    const [selectedDeliveryId, setSelectedDeliveryId] = useState();
    const [tooltip, setTooltip] = useState({ show: false, title: "Undefined", body: "None", variant: "" });

    const hideFactoryModal = () => {
        setFactoryModalIsShown(false);
    };

    useEffect(() => {
        if (state.provider) {
            const provider = new ethers.Contract(DeliveryManagerAddress, DeliveryArtifact.abi, state.provider);
            const signer = new ethers.Contract(DeliveryManagerAddress, DeliveryArtifact.abi, state.signer);
            setDeliveryManager({ provider, signer });
        }
    }, [state]);

    useEffect(() => {
        if (deliveryManager.provider) {
            deliveryManager.provider.on("DeliveryCreated", (deliveryId) => {
                getDeliveries();
            });
            getDeliveries();
        }
    }, [deliveryManager]);

    const toggleTooltip = (show) =>
        setTooltip({ show: show, title: tooltip.title, body: tooltip.body, variant: tooltip.variant });
    const showTooltip = function (title, body, variant) {
        setTooltip({ show: true, title: title, body: body, variant: variant });
    };

    const getDeliveries = async () => {
        //console.log("getDeliveries start !");
        setPending(true);
        toggleTooltip(false);
        try {
            const deliveriesList = await deliveryManager.provider.getAllDeliveries();
            setDeliveriesList(deliveriesList);
        } catch (error) {
            console.error(error);
        }

        setPending(false);
        //console.log("getDeliveries end !");
    };

    const hideModal = () => {
        setModalIsShown(false);
    };

    const showModal = () => {
        setFormData({ type: "reset" });
        setModalIsShown(true);
    };

    const handleFormChange = (event) => {
        setFormData({
            name: event.target.name,
            value: event.target.value,
            type: event.type,
        });
    };

    const submitCreateDelivery = async () => {
        try {
            const delivery = {
                deliveryId: "",
                supplierOrderId: formData.orderId,
                state: 0,
                from: formData.from,
                fromAddr: ethers.utils.getAddress(formData.fromAccount),
                to: formData.to,
                toAddr: ethers.utils.getAddress(formData.toAccount),
                fromHubId: Number(formData.fromHubId),
                toHubId: Number(formData.toHubId),
            };
            const tx = await deliveryManager.signer.newDelivery(delivery);
            await tx;
            showTooltip("Transaciton sent !", tx.hash, "success");
        } catch (error) {
            //console.log(error);
            showTooltip("Error", error?.data?.message, "danger");
        }

        hideModal();
    };

    const handleButtonClick = (state) => {
        //console.log("clicked");
        setSelectedDeliveryId(state.target.id);
        setFactoryModalIsShown(true);
        //console.log(state.target.id);
    };

    const columns = [
        {
            name: "Id",
            selector: (row) => `${row.deliveryId.substring(0, 8)}...`,
        },
        {
            name: "OrderId",
            selector: (row) => row.supplierOrderId,
        },
        {
            name: "State",
            selector: (row) => {
                switch (row.state) {
                    case 0:
                        return "No information";
                    case 1:
                        return "registered";
                    case 2:
                        return "atHub";
                    case 3:
                        return "inDelivery";
                    case 4:
                        return "arrived";
                    case 5:
                        return "delivered";
                    default:
                        return "Undef";
                }
            },
        },
        {
            name: "From",
            selector: (row) => row.from,
        },
        {
            name: "To",
            selector: (row) => row.to,
        },
        {
            name: "Depart hub",
            selector: (row) => row.fromHubId,
        },
        {
            name: "Dest. hub",
            selector: (row) => row.toHubId,
        },
        {
            cell: (row) =>
                state.roles.hasPilotRole &&
                row.state !== 3 && (
                    <Button onClick={handleButtonClick} id={row.deliveryId} variant="warning" size="sm">
                        Process
                    </Button>
                ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
        },
    ];
    //console.log(props);
    return (
        <div>
            {deliveriesList.length === 0 ? (
                <div>No deliveries.</div>
            ) : (
                <Fragment>
                    <Row>
                        <Col>
                            <i>Only pilots are able to process deliveries</i>
                        </Col>
                    </Row>
                    <Row className="justify-content-end">
                        <Col
                            sm="auto"
                            onClick={async () => {
                                await getDeliveries();
                            }}
                        >
                            <Button variant="primary">Refresh</Button>
                        </Col>
                        <Col sm="auto" onClick={showModal}>
                            <Button variant="primary">+ Add Delivery</Button>
                        </Col>
                    </Row>
                    <Row className="g-2 mt-2">
                        <Col>
                            <DataTable columns={columns} data={deliveriesList} progressPending={pending} />
                        </Col>
                    </Row>
                </Fragment>
            )}
            <Modal
                show={modalIsShown}
                onHide={hideModal}
                keyboard={false}
                aria-labelledby="contained-modal-title-vcenter"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Create delivery</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <DeliveryForm formChange={handleFormChange} setFormData={setFormData} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={hideModal}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={submitCreateDelivery}>
                        Submit
                    </Button>
                </Modal.Footer>
            </Modal>

            <FactoryModal
                show={factoryModalIsShown}
                onHide={hideFactoryModal}
                state={state}
                deliveryId={selectedDeliveryId}
                StarwingsMasterSigner={props.StarwingsMasterSigner}
            />

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

export default DeliveriesList;
