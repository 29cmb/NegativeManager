import { Modal, ModalBody, ModalHeader, Button } from "flowbite-react"

const ErrorModal = ({error, setError}: {error: string | null, setError: (value: null | string) => void}) => {
    return <Modal show={error !== null} onClose={() => setError(null)}>
        <ModalHeader>
            Error
        </ModalHeader>
        <ModalBody>
            <p>{error}</p>
            <br/>
            <Button color="red" onClick={() => setError(null)}>Close</Button>
        </ModalBody>
    </Modal>
}

export default ErrorModal;