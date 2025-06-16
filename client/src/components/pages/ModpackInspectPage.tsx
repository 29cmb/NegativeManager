import Image from "next/image"
import * as Types from "@/Types"
import { useEffect, useState } from "react"
const ModpackInspectPage = ({ modpackID, close }: { modpackID: string, close: () => void }) => {
    const [modpack, setModpack] = useState<Types.PublicModpackData | null>(null)

    useEffect(() => {
        const SERVER_URL = process.env.SERVER_URL as string
        fetch(SERVER_URL + `/api/v1/modpacks/info/${modpackID}`).then(d => d.json()).then(data => {
            setModpack(data.modpack)
        }).catch(err => {
            console.log(err)
        })
    }, [])

    if(modpack == null) {
        return <p>Loading...</p>
    }

    return <>
            <div className="flex flex-col items-start w-[80%] m-auto mt-[40px]">
                <button className="font-bold cursor-pointer text-[20px] text-[#23b9ff] mb-2" onClick={() => close()}><u>Go back</u></button>
                <div className="bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[rgb(50,50,50)] outline-[5px] w-full">
                    <div className="flex items-center w-full">
                        <div className="w-[120px] h-[120px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                            <Image
                                alt="Modpack icon"
                                src={modpack.icon || "https://29cmb.github.io/CDN/assets/balatro/missing.png"}
                                width={120}
                                height={120}
                                unoptimized
                                className="max-w-full max-h-full object-contain rounded-[10px]"
                            />
                        </div>
                        <div className="ml-[24px]">
                            <p className="text-2xl font-bold">{modpack.name}</p>
                            <p>Created by {modpack.author.name}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[rgb(31,31,31)] rounded-[20px] outline-[rgb(50,50,50)] mt-[20px] outline-[5px] w-full">
                    <p className="text-center py-[20px] text-[20px]">You do not have any downloaded mods!</p>
                </div>
            </div>
        </>
}

export default ModpackInspectPage