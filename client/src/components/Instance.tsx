'use client'
import Image from "next/image";
import { useEffect, useState } from "react";

const Instance = ({ name, time, icon, openInstance, full }: {name: string, time: string, icon: string | null, openInstance: () => void, full?: boolean}) => {
    const [active, setActive] = useState(false)

    useEffect(() => {
        const interval = setInterval(async () => {
            const isActive = await window.electron.isInstanceActive(name)
            console.log(isActive)
            setActive(isActive)
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return <div style={{
        width: (full == true ? "100%" : "32.5%")
    }} onClick={() => { openInstance() }} className="h-[160px] bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[5px] outline-[rgb(50,50,50)] hover:bg-[rgb(40,40,40)] transition-all duration-[0.25s] hover:rotate-[1deg] active:scale-95 hover:scale-105">
        <div className="flex">
            <div className="w-[120px] h-[120px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                <Image
                    alt="Instance icon"
                    src={icon || "https://29cmb.github.io/CDN/assets/balatro/missing.png"}
                    width={120}
                    height={120}
                    unoptimized
                    className="max-w-full max-h-full object-contain rounded-[10px]"
                />
            </div>
            <button onClick={(e) => {
                e.stopPropagation()
                if(active === true){
                    window.electron.killInstance(name)
                }  else {
                    window.electron.launchInstance(name) 
                }
            }} style={{
                backgroundColor: active === true ? "rgba(255,0,0,0.5)" : "rgba(14, 255, 86, 0.5)",
                outlineColor: active === true ? "rgb(75,32,32)" : "rgb(14,75,32)"
            }} className="absolute w-[120px] cursor-pointer h-[120px] outline-[5px] rounded-[10px] opacity-0 hover:opacity-100 transition-opacity duration-300 ease-in-out">
                <Image
                    src={active === true ? "https://29cmb.github.io/CDN/assets/balatro/stop.png" : "https://29cmb.github.io/CDN/assets/balatro/play.png"}
                    alt="Play icon"
                    width={60}
                    height={60}
                    className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] cursor-pointer"
                    unoptimized
                />
            </button>
            <div>
                <p className="ml-[20px] font-bold" style={{
                    fontSize: Math.max(16, 30 - Math.max(0, name.length - (full ? 30 : 6)))
                }}>{name}</p>
                <div className="flex items-center">
                    <Image
                        alt="Clock icon"
                        src={"https://29cmb.github.io/CDN/assets/balatro/clock.png"}
                        width={40}
                        height={40}
                        unoptimized
                        className="ml-[15px]"
                    />
                    <p className="text-[20px] font-semibold">{time}</p>
                </div>
            </div>
        </div>
    </div>
}

export default Instance;