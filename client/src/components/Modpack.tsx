import Image from "next/image";

const Modpack = ({ name, downloads, icon, onClick }: {name: string, downloads: string, icon: string, onClick?: () => void}) => {
    return <div onClick={onClick} className="h-[160px] w-[32.5%] bg-[rgb(31,31,31)] p-[20px] rounded-[20px] outline-[5px] outline-[rgb(50,50,50)] hover:bg-[rgb(40,40,40)] transition-all duration-[0.25s] hover:rotate-2 active:scale-85 hover:scale-110">
        <div className="flex">
            <div className="w-[120px] h-[120px] outline-[rgb(50,50,50)] outline-[5px] rounded-[10px] flex-shrink-0">
                <Image
                    alt="Modpack icon"
                    src={icon}
                    width={120}
                    height={120}
                    unoptimized
                    className="max-w-full max-h-full object-contain rounded-[10px]"
                />
            </div>
            <div className="flex-1 w-0">
                <p
                    className="ml-[20px] font-bold truncate max-w-full"
                    style={{
                        fontSize: Math.max(16, 30 - Math.max(0, name.length - (15)))
                    }}
                >
                    {name}
                </p>
                <p className="text-[20px] font-semibold ml-[20px]">{downloads} downloads</p>
            </div>
        </div>
    </div>
}

export default Modpack;