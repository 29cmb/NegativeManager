import Image from "next/image";

const Instance = ({ name, time, icon }: {name: string, time: string, icon: string | null}) => {
    return <div className="h-[160px] w-[32.5%] bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[5px] outline-[rgb(50,50,50)] hover:bg-[rgb(40,40,40)] transition-all duration-[0.25s] hover:rotate-2 active:scale-95 hover:scale-110">
        <div className="flex">
            <div className="w-[120px] h-[120px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                <Image
                    alt="Instance icon"
                    src={icon || "missing.png"}
                    width={120}
                    height={120}
                    unoptimized
                    className="max-w-full max-h-full object-contain rounded-[10px]"
                />
            </div>
            <button onClick={() => {
                window.electron.launchInstance(name)
                {/* TODO: instance launching visuals */}
            }} className="absolute w-[120px] cursor-pointer h-[120px] bg-[rgba(14,255,86,0.5)] outline-[5px] outline-[rgb(14,75,32)] rounded-[10px] opacity-0 hover:opacity-100 transition-opacity duration-300 ease-in-out">
                <Image
                    src={"/play.png"}
                    alt="Play icon"
                    width={60}
                    height={60}
                    className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] cursor-pointer"
                />
            </button>
            <div>
                <p className="ml-[20px] font-bold" style={{
                    fontSize: Math.max(16, 30 - Math.max(0, name.length - 6))
                }}>{name}</p>
                <div className="flex items-center">
                    <Image
                        alt="Clock icon"
                        src={"/clock.png"}
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