import Image from "next/image";

const Instance = ({ name, time, icon }: {name: string, time: string, icon: string}) => {
    return <div className="h-[160px] w-[32.5%] bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[5px] outline-[rgb(50,50,50)]">
        <div className="flex">
            <div className="w-[120px] h-[120px] bg-[rgb(50,50,50)] p-[5px] rounded-[10px] flex-shrink-0">
                <Image
                    alt="Instance icon"
                    src={icon}
                    width={120}
                    height={120}
                    unoptimized
                    className="max-w-full max-h-full object-contain"
                />
            </div>
            <div>
                <p className="ml-[20px] font-bold text-[30px] text-white">{name}</p>
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