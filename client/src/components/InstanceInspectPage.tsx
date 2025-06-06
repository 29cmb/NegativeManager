'use client'
import { formatTimePlayed, Profile } from "@/app/page";
import Image from "next/image";
import { useEffect, useState } from "react";

const InstanceInspectPage = ({ instance, close }: {instance: Profile |  null, close: () => void}) => {
    const [active, setActive] = useState(false)
    
    useEffect(() => {
        const interval = setInterval(async () => {
            if(instance === null) return;
            const isActive = await window.electron.isInstanceActive(instance?.name)
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
                            className="px-[70px] py-[5px] outline-[5px] outline-black rounded-[10px] font-bold text-[30px] [text-shadow:_2px_2px_0_#000,_-2px_2px_0_#000,2px_-2px_0_#000,-2px_-2px_0_#000] hover:scale-110 transition-all ease active:scale-100"
                        >
                            {active ? "Stop" : "Launch"}
                        </button>
                    </div>
                </div>
            </div>
            <div className="bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[rgb(50,50,50)] mt-[20px] outline-[5px] w-full">
                {
                    instance !== null 
                    ? (
                        (!instance.Mods || instance.Mods?.length == 0 )
                        ? <p className="text-center py-[20px] text-[20px]">You do not have any downloaded mods!</p> 
                        : (instance.Mods?.map((mod, index) => {
                            if (!("tag" in mod)) {
                                return <div key={index}>
                                    <p>{mod.name}</p>
                                </div>
                            }

                            return <div key={index}>
                                <p>{mod.name}</p>
                            </div>
                        }))
                    ) : <p className="text-center py-[20px] text-[20px]">You do not have any downloaded mods!</p>}
            </div>
        </div>
    </>
}

export default InstanceInspectPage;