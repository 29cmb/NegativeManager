import { Modal, ModalBody, ModalHeader, TextInput, Button } from "flowbite-react"
import { useEffect, useState } from "react";

const SettingsModal = ({ open, setOpen }: {open: boolean, setOpen: (value: boolean) => void}) => {
    const [steamPlaceholder, setSteamPlaceholder] = useState("Loading...")
    const [dataPlaceholder, setDataPlaceholder] = useState("Loading...")
    const [errorText, setErrorText] = useState("")

    const [steamPath, setSteamPath] = useState("")
    const [dataPath, setDataPath] = useState("")

    useEffect(() => {
        (async() => {
            const steam = await window.electron.getConfigurationTextPlaceholder("steam")
            setSteamPlaceholder(steam)

            const data = await window.electron.getConfigurationTextPlaceholder("data")
            setDataPlaceholder(data)
        })()
    }, [])

    const validateFields = async() => {
        if(steamPath == "") {
            setErrorText("Steam path not provided.")
            return
        }

        if(dataPath == "") {
            setErrorText("Data path not provided.")
            return
        }

        const steamValidation = await window.electron.validatePathType(steamPath, "steam")
        if(steamValidation !== true) {
            setErrorText(steamValidation)
            return
        }

        const dataValidation = await window.electron.validatePathType(dataPath, "data")
        if(dataValidation !== true) {
            setErrorText(dataValidation)
            return
        }
        
        window.electron.updateConfigField("balatro_data_path", dataPath)
        window.electron.updateConfigField("balatro_steam_path", steamPath)
        setOpen(false)
    }

    return <Modal show={open} onClose={validateFields}>
        <ModalHeader>
            Balatro information
        </ModalHeader>
        <ModalBody>
            <p>We couldn&apos;t automatically find your Balatro folders, so we&apos;ll need you to fill them in here</p>
            <br/>
            <p>Balatro Steam Path</p>
            <TextInput placeholder={steamPlaceholder} onChange={(event) => setSteamPath(event.target.value)}></TextInput>
            <br/>
            <p>Balatro Data Path</p>
            <TextInput placeholder={dataPlaceholder} onChange={(event) => setDataPath(event.target.value)}></TextInput>
            <br/>
            <p className="text-[#FF0000]">{errorText}</p>
            <Button color="green" onClick={validateFields}>Confirm</Button>
        </ModalBody>
    </Modal>
}

export default SettingsModal;