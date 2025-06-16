'use client'
import * as Types from "@/Types"
import { formatTimePlayed } from "@/Util";
import Image from "next/image";
import { useEffect, useState } from "react";

const InstanceInspectPage = ({ instanceName, close }: {instanceName: string | undefined, close: () => void}) => {
    const [active, setActive] = useState(false)
    const [instance, setInstance] = useState<Types.Profile | null>(null)
    
    const refresh = async () => {
        if(instanceName == undefined) return;
        const profileInfo = await window.electron.getProfileInfo(instanceName)
        setInstance(profileInfo)
    }

    useEffect(() => {
        refresh()
    }, [])

    useEffect(() => {
        const interval = setInterval(async () => {
            if(instanceName === undefined) return;
            
            const isActive = await window.electron.isInstanceActive(instanceName)
            setActive(isActive)
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if(instance === null) {
        return <p>Instance not loaded.</p>
    }

    return <>
        <div className="flex flex-col items-start w-[80%] m-auto mt-[40px]">
            <button className="font-bold text-[20px] text-[#23b9ff] mb-2" onClick={() => close()}><u>Go back</u></button>
            <div className="bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[rgb(50,50,50)] outline-[5px] w-full">
                <div className="flex items-center w-full">
                    <div className="w-[120px] h-[120px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                        <Image
                            alt="Instance icon"
                            src={instance.Icon || "https://29cmb.github.io/CDN/assets/balatro/missing.png"}
                            width={120}
                            height={120}
                            unoptimized
                            className="max-w-full max-h-full object-contain rounded-[10px]"
                        />
                    </div>
                    <div className="ml-[24px]">
                        <p className="text-2xl font-bold">{instance.name}</p>
                        <div className="flex items-center">
                            <Image
                                alt="Clock icon"
                                src={"https://29cmb.github.io/CDN/assets/balatro/clock.png"}
                                width={40}
                                height={40}
                                unoptimized
                            />
                            <p className="text-[20px] font-semibold">{formatTimePlayed(instance.TimePlayed)}</p>
                        </div>
                    </div>
                    <div className="ml-auto">
                        <button
                            style={{
                                background: active ? "linear-gradient(#eb3455, #eb3434)" : "linear-gradient(#34eb3a,#34eb7a)"
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                if(active === true){
                                    window.electron.killInstance(instance.name)
                                }  else {
                                    window.electron.launchInstance(instance.name) 
                                }
                            }}
                            className="px-[70px] py-[5px] outline-[5px] mr-[25px] outline-black rounded-[10px] font-bold text-[30px] [text-shadow:_2px_2px_0_#000,_-2px_2px_0_#000,2px_-2px_0_#000,-2px_-2px_0_#000] hover:scale-110 transition-all ease active:scale-100"
                        >
                            {active ? "Stop" : "Launch"}
                        </button>
                    </div>
                </div>
            </div>
            <div className="h-[60px] mt-[20px] bg-[rgb(31,31,31)] w-full rounded-[20px] gap-[15px] p-[20px] outline-[rgb(50,50,50)] outline-[5px] flex items-center justify-end">
                <button className="h-[40px] w-[40px] rounded-[5px] outline-[rgb(50,50,50)] outline-[5px]">
                    <Image
                        src={"https://img.icons8.com/?size=100&id=59872&format=png&color=FFFFFF"}
                        width={25}
                        height={25}
                        alt="Refresh icon"
                        className="ml-2 hover:scale-120 transition-all ease duration-300 active:rotate-[360deg] cursor-pointer"
                        onClick={refresh}
                    />
                </button>
                <button className="h-[40px] w-[40px] rounded-[5px] outline-[rgb(50,50,50)] outline-[5px]">
                    <Image
                        src={"https://img.icons8.com/?size=100&id=62888&format=png&color=FFFFFF"}
                        width={25}
                        height={25}
                        alt="Refresh icon"
                        className="ml-2 hover:scale-120 transition-all ease duration-300 active:scale-95 cursor-pointer"
                        onClick={() => {}} 
                    />
                    {/* TODO: add content button */}
                </button>
            </div>
            <div className="bg-[rgb(31,31,31)] rounded-[20px] outline-[rgb(50,50,50)] mt-[20px] outline-[5px] w-full">
                {
                    instance !== null 
                    ? (
                        (!instance.Mods || instance.Mods?.length == 0 )
                        ? <p className="text-center py-[20px] text-[20px]">You do not have any downloaded mods!</p> 
                        : (instance.Mods?.map((mod, index) => {
                            const bgColor = index % 2 === 0 ? "rgb(28,28,28)" : "rgb(23,23,23)";
                            if (!("tag" in mod)) {
                                return <div className="p-[10px] flex items-center" key={index} style={{ backgroundColor: bgColor }}>
                                    <div className="w-[60px] h-[60px] mr-[20px] m-[10px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                                        <Image 
                                            src={"https://29cmb.github.io/CDN/assets/balatro/missing.png"}
                                            alt={"Unregistered mod icon"}
                                            width={100}
                                            height={100}
                                        />
                                    </div>
                                    <p>{mod.name}</p>
                                    <button onClick={async() => {
                                        if(instance === null) return;
                                        await window.electron.deleteMod(instance.name, mod.name)
                                        setTimeout(() => refresh(), 500)
                                    }} className="w-[45px] h-[45px] m-[10px] outline-[rgb(50,50,50)] hover:bg-[rgb(255,54,54)] hover:outline-[rgb(143,62,62)] hover:scale-105 active:scale-95 transition-ease duration-200 outline-[5px] rounded-[10px] flex-shrink-0 flex items-center justify-center ml-auto">
                                        <Image 
                                            src={"https://img.icons8.com/?size=100&id=15015&format=png&color=FFFFFF"}
                                            width={40}
                                            height={40}
                                            alt={"Delete mod button"}
                                            className="max-w-full max-h-full"
                                        />
                                    </button>
                                </div>
                            }

                            return <div className="p-[10px] flex items-center" key={index} style={{ backgroundColor: bgColor }}>
                                <div className="w-[60px] h-[60px] mr-[20px] m-[10px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                                    <Image 
                                        src={mod.icon}
                                        alt={"Mod icon"}
                                        width={100}
                                        height={100}
                                        className="max-w-full max-h-full object-contain rounded-[10px]"
                                    />
                                </div>
                                <div>
                                    <p className="font-bold text-[20px]">{mod.name} <span className="font-light text-[12px]"><i>{mod.tag}</i></span></p>
                                    <p>{mod.author}</p>
                                </div>
                                <button onClick={async() => {
                                    if(instance === null) return;
                                    await window.electron.deleteMod(instance.name, mod.name)
                                    setTimeout(() => refresh(), 500)
                                }} className="w-[45px] h-[45px] m-[10px] outline-[rgb(50,50,50)] hover:bg-[rgb(255,54,54)] hover:outline-[rgb(143,62,62)] hover:scale-105 active:scale-95 transition-ease duration-200 outline-[5px] rounded-[10px] flex-shrink-0 flex items-center justify-center ml-auto">
                                    <Image 
                                        src={"https://img.icons8.com/?size=100&id=15015&format=png&color=FFFFFF"}
                                        width={40}
                                        height={40}
                                        alt={"Delete mod button"}
                                        className="max-w-full max-h-full"
                                    />
                                </button>
                            </div>
                        }))
                    ) : <p className="text-center py-[20px] text-[20px]">You do not have any downloaded mods!</p>
                }
            </div>
        </div>
    </>
}

export default InstanceInspectPage;